import OpenAI from "openai";
import dotenv from "dotenv";
import {
  fetchHackerNewsTop,
  fetchGitHubTrending,
  fetchHnComments,
  fetchLobsters,
  fetchReddit,
  fetchArxivNew,
  fetchShowHN,
  fetchWhosHiring,
  fetchLayoffsFyi,
  canonicalUrl,
} from "./sources.js";
import { prefilterPoolByBeats } from "./embeddings.js";
import { logUsage } from "./usage.js";
import { pickVariant } from "./variants.js";
import { moderateClusters } from "./moderation.js";
import { callOpenAIWithRetry, STREAM_CEILING_MS } from "./openai-utils.js";

const PREFILTER_TOPN = parseInt(process.env.BRIEF_PREFILTER_TOPN || "30", 10);

dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const HYPE_VALUES = ["hyped", "skeptical", "experimental", "deep_dive"];

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

/* ─── Pool assembly ────────────────────────────────────────── */

export async function fetchSourcePool() {
  const [hn, gh, lobsters, reddit, arxiv, showhn, whosHiring, layoffs] = await Promise.all([
    fetchHackerNewsTop(30).catch(() => []),
    fetchGitHubTrending("daily").catch(() => []),
    fetchLobsters(20).catch(() => []),
    fetchReddit(["programming", "MachineLearning"], 10).catch(() => []),
    fetchArxivNew(["cs.LG", "cs.AI", "cs.CL"], 15).catch(() => []),
    fetchShowHN(15).catch(() => []),
    fetchWhosHiring(30).catch(() => []),
    fetchLayoffsFyi(15).catch(() => []),
  ]);
  return { hn, gh, lobsters, reddit, arxiv, showhn, whosHiring, layoffs };
}

/**
 * Summarize hiring signal into a compact context block the LLM can lean on for
 * "why this matters" lines. Not added to clusters — informs the editor, doesn't compete for slots.
 */
function summarizeHiringSignal(whosHiring, layoffs) {
  const lines = [];
  if (whosHiring?.length) {
    const sample = whosHiring
      .slice(0, 20)
      .map((p) => `· ${p.title.replace(/\s+/g, " ").slice(0, 160)}`)
      .join("\n");
    lines.push(`HIRING — recent "Who is hiring" postings (this month's HN thread):\n${sample}`);
  }
  if (layoffs?.length) {
    const sample = layoffs
      .slice(0, 12)
      .map((l) => `· ${l.company || "Unknown"} (${l.industry || "?"}, ${l.location || "?"})`)
      .join("\n");
    lines.push(`LAYOFFS — recent (via Layoffs.fyi):\n${sample}`);
  }
  return lines.join("\n\n");
}

function clusterByUrl(pools) {
  const buckets = new Map();
  const order = [];

  const pushItem = (kind, item, idx) => {
    if (!item?.url) return;
    const canon = canonicalUrl(item.url);
    if (!canon) return;
    const ref = `${kindToPrefix(kind)}${idx}`;
    let bucket = buckets.get(canon);
    if (!bucket) {
      bucket = { canonical: canon, primary: { kind, item, ref }, refs: [] };
      buckets.set(canon, bucket);
      order.push(canon);
    }
    bucket.refs.push({ kind, item, ref });
  };

  pools.hn.forEach((it, i) => pushItem("hn", it, i));
  pools.gh.forEach((it, i) => pushItem("gh", it, i));
  pools.lobsters.forEach((it, i) => pushItem("lo", it, i));
  pools.reddit.forEach((it, i) => pushItem("rd", it, i));
  pools.arxiv.forEach((it, i) => pushItem("ax", it, i));
  pools.showhn.forEach((it, i) => pushItem("sh", it, i));

  return order.map((canon) => buckets.get(canon));
}

function kindToPrefix(k) {
  return { hn: "HN", gh: "GH", lo: "LO", rd: "RD", ax: "AX", sh: "SH" }[k];
}

function kindToSourceName(k) {
  return {
    hn: "hackernews",
    gh: "github_trending",
    lo: "lobsters",
    rd: "reddit",
    ax: "arxiv",
    sh: "show_hn",
  }[k];
}

function kindToFriendlyName(kind, item) {
  if (kind === "hn") return "HackerNews thread";
  if (kind === "gh") return "GitHub repo";
  if (kind === "lo") return "Lobsters thread";
  if (kind === "rd") return `r/${item.subreddit}`;
  if (kind === "ax") return "arXiv paper";
  if (kind === "sh") return "Show HN";
  return "Source";
}

/**
 * Streaming variant of generateBrief.
 *
 * Calls OpenAI in stream mode and invokes `onDelta(text)` for each token chunk and
 * `onComplete(brief)` once the full hydrated brief is ready. The caller (an SSE route)
 * decides how to forward those events to the client.
 */
export async function generateBriefStream(input, { onDelta, onComplete, onError }) {
  try {
    const role = input.role || "software_engineer";
    const skillLevel = input.skillLevel || input.skill_level || "intermediate";
    const domains = input.domains || input.topics || [];
    const depth = input.depth || "standard";

    if (!Array.isArray(domains) || domains.length === 0) {
      throw new Error("at least one domain required");
    }

    const pools = input.sourcePool || (await fetchSourcePool());
    const rawClusters = clusterByUrl(pools);
    const { kept: moderatedClusters } = moderateClusters(rawClusters);
    const clusters = await prefilterPoolByBeats({
      clusters: moderatedClusters,
      role,
      skillLevel,
      domains,
      topN: PREFILTER_TOPN,
    });

    const hnClustersForComments = clusters
      .filter((c) => c.primary.kind === "hn" && (c.primary.item.comments ?? 0) >= 20)
      .slice(0, 8);
    const commentsEntries = await Promise.all(
      hnClustersForComments.map(async (c) => [
        c.primary.ref,
        await fetchHnComments(c.primary.item.id, 6),
      ])
    );
    const commentsByRef = Object.fromEntries(commentsEntries.filter(([, v]) => v.length));
    const hiringSignal = summarizeHiringSignal(pools.whosHiring || [], pools.layoffs || []);
    const pastEditions = summarizePastEditions(input.pastEditions || []);

    const prompt = buildPrompt({
      role,
      skillLevel,
      domains,
      depth,
      clusters,
      commentsByRef,
      hiringSignal,
      pastEditions,
      excludeTopics: input.excludeTopics,
      topicWeights: input.topicWeights,
    });

    // Wave N Day 3 — AbortController ceiling on streaming. NO retry on stream (would
    // corrupt SSE protocol from the client's perspective). Just fail cleanly.
    const abortCtl = new AbortController();
    const streamTimer = setTimeout(() => abortCtl.abort(), STREAM_CEILING_MS);
    const stream = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      response_format: { type: "json_object" },
      max_tokens: 2400,
      stream: true,
      stream_options: { include_usage: true },
    }, { signal: abortCtl.signal });

    let raw = "";
    let usage = null;
    for await (const chunk of stream) {
      if (chunk.usage) usage = chunk.usage;
      const delta = chunk.choices?.[0]?.delta?.content || "";
      if (!delta) continue;
      raw += delta;
      onDelta?.(delta);
    }

    if (usage) {
      logUsage({
        userId: input.userId,
        endpoint: input.endpoint || "/api/brief/stream",
        model: OPENAI_MODEL,
        prompt_tokens: usage.prompt_tokens,
        completion_tokens: usage.completion_tokens,
        total_tokens: usage.total_tokens,
      });
    }

    let brief;
    try {
      brief = JSON.parse(raw);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("Model returned non-JSON output");
      brief = JSON.parse(m[0]);
    }

    clearTimeout(streamTimer);
    const variant = await pickVariant();
    const hydrated = hydrateBrief({
      brief,
      clusters,
      pools,
      role,
      skillLevel,
      domains,
      depth,
      lettersRaw: input.letters,
    });
    hydrated.variant_id = variant.id;
    await attachPickDeepDive(hydrated, role, skillLevel);
    onComplete?.(hydrated);
    return hydrated;
  } catch (err) {
    onError?.(err);
    throw err;
  }
}

function hydrateBrief({ brief, clusters, pools, role, skillLevel, domains, depth, lettersRaw }) {
  const clusterByRef = new Map();
  clusters.forEach((c) => clusterByRef.set(c.primary.ref, c));

  const sections = (brief.sections || [])
    .map((sec) => ({
      topic: sec.topic,
      stories: (sec.stories || [])
        .map((st) => {
          const cluster = clusterByRef.get(st.ref);
          if (!cluster) return null;
          const primary = cluster.primary.item;
          const kind = cluster.primary.kind;
          const altSources = cluster.refs
            .filter((r) => r.kind !== kind || r.item !== primary)
            .slice(0, 3)
            .map((r) => ({
              kind: r.kind,
              label: kindToFriendlyName(r.kind, r.item),
              url:
                r.kind === "hn"
                  ? r.item.hn_url
                  : r.kind === "lo"
                  ? r.item.lobsters_url
                  : r.kind === "rd"
                  ? r.item.reddit_url
                  : r.kind === "sh"
                  ? r.item.hn_url
                  : r.item.url,
              score: r.item.score,
              comments: r.item.comments,
            }));

          return {
            ref: st.ref,
            title: st.title || primary.title,
            tldr: st.tldr || "",
            why_it_matters: st.why_it_matters || "",
            community_take: st.community_take || "",
            hype: HYPE_VALUES.includes(st.hype) ? st.hype : null,
            predicted_click: st.predicted_click === true,
            source: kindToSourceName(kind),
            url: primary.url,
            hn_url: primary.hn_url || null,
            alt_sources: altSources,
            meta: metaFor(kind, primary),
          };
        })
        .filter(Boolean),
    }))
    .filter((sec) => sec.stories.length > 0);

  const allStoryRefs = new Set();
  sections.forEach((s) => s.stories.forEach((st) => allStoryRefs.add(st.ref)));
  const editor_pick =
    brief.editor_pick && allStoryRefs.has(brief.editor_pick) ? brief.editor_pick : null;

  // Validate featured_comment: ref must exist + text must be non-empty + author present
  let featured_comment = null;
  if (
    brief.featured_comment &&
    brief.featured_comment.text &&
    brief.featured_comment.text.trim().length > 5
  ) {
    const ref = brief.featured_comment.ref;
    if (!ref || allStoryRefs.has(ref)) {
      featured_comment = {
        ref: ref || null,
        text: String(brief.featured_comment.text).slice(0, 400).trim(),
        author: String(brief.featured_comment.author || "anon").slice(0, 32).trim(),
      };
    }
  }

  // Wave N Day 7 — "The Take": one explicit editorial opinion per brief.
  // Optional field; cap at 30 words. Rendered as a small pulled block below editor_note.
  const take = brief.take && String(brief.take).trim()
    ? String(brief.take).trim().split(/\s+/).slice(0, 35).join(" ")
    : "";

  return {
    headline: brief.headline || "Today in tech",
    email_subject: brief.email_subject || "",
    editor_note: brief.editor_note || "",
    editor_pick,
    pull_quote: brief.pull_quote || "",
    take,
    featured_comment,
    letters: Array.isArray(lettersRaw)
      ? lettersRaw.slice(0, 2).map((l) => ({
          id: l.id,
          body: l.body,
          author: l.author_name || "a reader",
        }))
      : [],
    generated_at: new Date().toISOString(),
    role,
    skill_level: skillLevel,
    domains,
    depth,
    sections,
    counts: {
      hn: pools.hn.length,
      gh: pools.gh.length,
      lobsters: pools.lobsters.length,
      reddit: pools.reddit.length,
      arxiv: pools.arxiv.length,
      show_hn: pools.showhn.length,
      whos_hiring: (pools.whosHiring || []).length,
      layoffs: (pools.layoffs || []).length,
      clusters: clusters.length,
    },
  };
}

/**
 * After the main brief is hydrated, write a longer (3-4 sentence) editorial paragraph for the
 * editor's pick story. Cheap second call to the LLM. Returns null on any failure so the brief
 * still renders without the deep-dive if this fails.
 */
export async function writePickDeepDive({ pickStory, role, skillLevel }) {
  if (!pickStory) return null;
  try {
    const prompt = `You are the editor of Dispatch · Tech writing a 3-4 sentence editorial paragraph for the day's Editor's Pick. Voice: thoughtful, observed, slightly dry — the same retro newspaper editor as the daily brief. Reader is a ${role} at ${skillLevel} level.

Story title: ${pickStory.title}
TL;DR: ${pickStory.tldr || "(no tldr)"}
Why it matters: ${pickStory.why_it_matters || "(none yet)"}
URL: ${pickStory.url}

Write the paragraph. Don't restate the TL;DR — go deeper: what the story signals about the field, what skills it surfaces, what to read next, what to ignore. 3-4 sentences. No exclamation marks. No emojis. No "in conclusion" / "ultimately" filler.

Output ONLY valid JSON: { "deep_dive": "the paragraph" }`;

    const resp = await callOpenAIWithRetry(
      () =>
        openai.chat.completions.create({
          model: OPENAI_MODEL,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.5,
          response_format: { type: "json_object" },
          max_tokens: 350,
        }),
      { timeoutMs: 15_000, endpoint: "deep_dive" }
    );
    logUsage({
      endpoint: "deep_dive",
      model: OPENAI_MODEL,
      prompt_tokens: resp.usage?.prompt_tokens,
      completion_tokens: resp.usage?.completion_tokens,
      total_tokens: resp.usage?.total_tokens,
    });
    const raw = resp.choices?.[0]?.message?.content || "";
    const parsed = JSON.parse(raw);
    return parsed.deep_dive ? String(parsed.deep_dive).slice(0, 800).trim() : null;
  } catch (err) {
    console.warn("deep-dive write failed (non-fatal):", err.message);
    return null;
  }
}

function metaFor(kind, item) {
  if (kind === "hn") return { score: item.score, comments: item.comments };
  if (kind === "gh") return { language: item.language, stars_today: item.stars_today };
  if (kind === "lo") return { score: item.score, comments: item.comments, tags: item.tags };
  if (kind === "rd") return { score: item.score, comments: item.comments, subreddit: item.subreddit };
  if (kind === "ax") return { authors: item.authors, categories: item.categories };
  if (kind === "sh") return { score: item.score, comments: item.comments };
  return {};
}

/* ─── Prompt building ──────────────────────────────────────── */

function clusterListLine(cluster) {
  return cluster.refs
    .map(({ kind, item }) => {
      if (kind === "hn") return `  · HN: "${item.title}" — ${item.score}↑, ${item.comments} comments`;
      if (kind === "gh") return `  · GitHub: ${item.title} (${item.language || "?"}) — ${item.description || "(no description)"} — +${item.stars_today} stars today`;
      if (kind === "lo") return `  · Lobsters: "${item.title}" — ${item.score}↑, tags [${(item.tags || []).join(",")}]`;
      if (kind === "rd") return `  · r/${item.subreddit}: "${item.title}" — ${item.score}↑, ${item.comments} comments`;
      if (kind === "ax") return `  · arXiv [${(item.categories || []).slice(0, 3).join(", ")}]: "${item.title}" by ${(item.authors || []).slice(0, 2).join(", ")} — ${item.summary?.slice(0, 220) || ""}`;
      if (kind === "sh") return `  · Show HN: "${item.title}" — ${item.score}↑, ${item.comments} comments`;
      return "";
    })
    .join("\n");
}

function buildPrompt({ role, skillLevel, domains, depth, clusters, commentsByRef, hiringSignal, pastEditions, pastEditorPicks, letters, readerSignal, excludeTopics, topicWeights }) {
  const depthSpec = {
    skim: "one short sentence per story (max 18 words). No 'why it matters' line.",
    standard: "a one-sentence TL;DR (max 22 words) plus one short 'why it matters' line (max 20 words).",
    deep: "a 2-3 sentence TL;DR and a 'why it matters' line (max 28 words).",
  }[depth];

  const poolBlock = clusters
    .map((c) => {
      const ref = c.primary.ref;
      const url = c.primary.item.url;
      const head = `[${ref}] ${c.primary.item.title} — ${url}`;
      const sources = clusterListLine(c);
      const comments = commentsByRef[ref];
      const commentBlock = comments?.length
        ? `\n  TOP COMMENTS:\n${comments.map((c) => `    - ${c}`).join("\n")}`
        : "";
      return `${head}\n${sources}${commentBlock}`;
    })
    .join("\n\n");

  const weightsLine =
    topicWeights && Object.keys(topicWeights).length
      ? `Beat priorities (1=low, 5=high; treat as a soft signal when picking and ordering): ${JSON.stringify(topicWeights)}`
      : "";
  const excludeLine =
    Array.isArray(excludeTopics) && excludeTopics.length
      ? `Reader has explicitly EXCLUDED these topics — do not surface any story whose subject matches: ${excludeTopics.join(", ")}`
      : "";

  return `You are the editor of "Dispatch", a daily career-intelligence brief for working developers and technology students.

**VOICE — read this carefully.**

Imagine the editor: a thoughtful friend with a newsroom job who read the wires this morning and is now telling you what mattered. Concise. Slightly dry. Mildly opinionated when warranted. Never breathless, never reverent. They've seen hype cycles before; they've also seen genuine shifts. They can tell the difference.

Hard rules — these are constant:
- No exclamation marks. Ever.
- No emojis anywhere in the output.
- No marketing words: "revolutionary", "game-changing", "unprecedented", "stunning", "incredible", "amazing", "powerful", "seamless", "elevate", "robust", "best-in-class", "transformative", "cutting-edge", "state-of-the-art", "groundbreaking".
- No corporate filler: "leverage", "synergy", "ecosystem play", "at scale", "next-generation", "unlock", "enhance your employability", "boost your career", "stay ahead of the curve", "future-proof your skills".
- No tech-pundit cliché: "moves fast", "won't be the last", "all eyes on", "the year of X", "X is the new Y", "watch this space", "the rise of", "the death of", "everything you need to know".
- No LinkedIn-isms: "thrilled to share", "humbled to announce", "passionate about", "in today's fast-paced world", "as a [role], I…".
- Don't restate the obvious. If a story's TL;DR makes the point, the why_it_matters doesn't repeat it.
- Don't editorialize where the wire is enough. If the title is "Anthropic acquires Stainless", the editorial value is the *signal* (high comp for ML talent, consolidation in tooling), not "this is a big deal."
- Headlines lead with the subject or observation, not a gerund. Not "Building X." Try "X arrives, and …" or just describe what happened.

Aim for sentences that feel inevitable in retrospect — clear, slightly observed, with a small turn at the end. Aim for the kind of writing a senior engineer would forward to their group chat without embarrassment.

**CONCRETE VOICE EXAMPLES — read and pattern-match.**

For why_it_matters lines:
  BAD: "Understanding these vulnerabilities can enhance your security practices, especially relevant for roles at companies like Zocdoc and Neuralink."
  GOOD: "Kernel CVE chains keep the patch treadmill running. If you maintain Linux infra, set aside an hour this week."

  BAD: "This new framework could revolutionize the way developers build applications and stay ahead of the curve."
  GOOD: "A thin layer over an existing thing. Worth a glance if you already write a lot of REST handlers; safe to skip otherwise."

  BAD: "Mastering these techniques will boost your career and make you more valuable to employers."
  GOOD: "Eval tooling is where the ML hiring bar moved this quarter. Two of three postings in this month's HN thread mention 'eval' explicitly."

  BAD: "An exciting development in the world of AI that you won't want to miss."
  GOOD: "Anthropic shipped a quieter feature than the headline suggests. The actual change is in the SDK; the press release is theater."

For editor_note lines:
  BAD: "Today's news underscores the urgency of security in software development. As vulnerabilities surface, skills in secure coding and infrastructure are increasingly critical."
  GOOD: "Security mostly, with a sidebar of new tooling — about par for a Monday. The Gentoo CVE chain is the one to skim if you only have a minute."

  BAD: "AI continues to dominate the conversation as new tools emerge daily, transforming the developer landscape."
  GOOD: "Three AI launches, two of them are wrappers. The arXiv paper is the only one that will still be cited in six months."

For pull_quote lines:
  BAD: "Security issues are a constant reminder of our responsibilities as developers."
  GOOD: "Half the comments think it's a wrapper; the other half are already using it in prod."

  BAD: "Innovation in AI is reshaping how we work every day."
  GOOD: "Another one for the 'is this a feature or a company?' pile."

The pattern: specific over abstract. Observed over asserted. Slightly dry. Names a thing. Resists summary.

The reader is a **${role}** at **${skillLevel}** level whose career-relevant beats are: **${domains.join(", ")}**.
${weightsLine}
${excludeLine}

Reading depth: ${depth}. For each story write ${depthSpec}.

Your job — produce a brief that helps THIS reader make career-aware sense of today's tech signal. Not generic news; intelligence grounded in what affects their skills, hiring landscape, learning priorities, and field positioning.

The pool below is clustered: each entry is one canonical story, possibly cross-posted to multiple sources (HN / GitHub Trending / Lobsters / Reddit / arXiv / Show HN). Reference each cluster by its primary id (e.g. "HN3", "AX2", "SH7").

**OUTPUT SHAPE — non-negotiable.**

Every brief MUST contain:
- **At least 5 stories total. Hard floor.** Edition can have up to 8 in standard depth.
- **At least 2 sections (beats), ideally 3.** A one-section brief is a failure — the system will reject it. If you can't find 5 matches on a strict reading of the beats, loosen — surface stories that are tangentially relevant to the reader's beats. A Backend Developer cares about new databases, language updates, dev tooling, hiring news; an ML Engineer cares about model launches, infra, papers, eval tooling. Be generous; the editor's job is breadth, not gatekeeping.
- One editor's pick, one pull quote, one 2-sentence editor's note.

Rules:
1. Pick clusters that plausibly serve the reader's beats. The pool has been pre-filtered for relevance, so most clusters ARE relevant — your job is to pick the best 5-8, not to reject. Do NOT invent stories.
2. Group selected stories under headings from the reader's beats. Each story under one heading only.
3. For each story:
   - Use its primary ref id exactly.
   - "tldr": per depth spec.
   - "why_it_matters": **CAREER-GROUNDED**. Connect the story to the reader's beats: skills that just became more valuable, hiring signals shifting, tools worth learning, abstractions worth understanding, things to ignore. **When the HIRING SIGNAL below is relevant, reference it concretely** — name specific companies hiring/cutting in the reader's domain, role titles trending in postings, etc. Examples: "Anthropic and Scale both have ML eval roles open this month — this raises the bar on eval-tooling skills" / "another sign Rust web frameworks are leaving the toy-project zone" / "incremental — interesting if you already work in X, skippable otherwise."
   - "community_take": one sentence summarizing the TOP COMMENTS sentiment if comments shown. Skip if none.
   - "hype": one of "hyped" | "skeptical" | "experimental" | "deep_dive".
   - "predicted_click": true if this story closely matches what the READER SIGNAL block (when present) suggests this reader usually clicks. Skip the field or set false otherwise. Use sparingly — at most 1-2 stories per brief.
4. Omit beats with zero matching stories.
5. Choose ONE editor's pick — the single most worth this reader's time today. Bias toward concrete career impact over novelty.
6. Write a 2-sentence editor's note. **MUST name at least one specific story by subject** (not by category — "the Gentoo kernel CVE" not "security stories"). **MUST commit to an editorial observation, not summarize.** Wry, observed, not press-release. Banned editor-note shapes: "X remains a pressing concern…", "X dominates today's tech news…", "The focus on Y is…", "As Z continues to evolve…". Required shape: short, specific, with a small call ("the Gentoo chain is the one to skim if you have a minute" / "two ML launches, one is a wrapper" / "skip the AI items today — the database story is the read").
7. Pull ONE sharp quotable sentence (≤15 words).
7a. **"The Take"** — write ONE explicit editorial opinion (≤30 words) committing to a position on what today's news actually means. This is the editor's voice at its most exposed — not summary, not balanced. Take a side. Don't hedge. Examples of the form:
    GOOD: "Anthropic's launch is the more interesting one this week; OpenAI is shipping iteration, not direction."
    GOOD: "Not the rewrite people say it is — it's a cleanup, and a needed one."
    GOOD: "If you're hiring ML engineers right now, the eval-tooling skill bar moved this week. Update your loop."
    BAD: "Today shows AI is evolving rapidly with much to consider on all sides." (no commitment)
    BAD: "Security is more important than ever in our modern landscape." (empty)
    Output as the "take" field. Skip the field entirely if you can't write something sharp.
8. **From the comments** — featured_comment must come ONLY from a "TOP COMMENTS" block of an HN story. Those blocks look like:
       TOP COMMENTS:
         - [username1] their comment text
         - [username2] another comment
   Do NOT pull from arXiv author lists, GitHub descriptions, or anything else — only from explicit TOP COMMENTS blocks. If at least one such block exists, pick the sharpest / funniest / most-insightful single comment across all of them and emit a "featured_comment" object: { ref (the HN story id it came from, e.g. "HN3"), text (40 words max, lightly cleaned of typos but preserving voice), author (the [username] from the bracket tag). Skip the field entirely if no TOP COMMENTS blocks appear or none are quotable.
9. Write a 6-9 word email subject — specific, no clickbait.

Output ONLY valid JSON, no markdown fences:
{
  "headline": "one punchy sentence summarizing what today means for this reader's field",
  "email_subject": "the subject line",
  "editor_note": "two sentences in editor voice, framed for the reader",
  "editor_pick": "HN3",
  "pull_quote": "a sharp, quotable line",
  "take": "one explicit editorial opinion (≤30 words) committing to a position",
  "featured_comment": { "ref": "HN3", "text": "the comment, cleaned", "author": "username" },
  "sections": [
    {
      "topic": "beat name from the reader's list",
      "stories": [
        {
          "ref": "HN3",
          "title": "short, rewritten title",
          "tldr": "the TL;DR per the depth spec",
          "why_it_matters": "career-grounded 'why it matters' (omit for skim depth)",
          "community_take": "one sentence summarizing comments (only if shown)",
          "hype": "one of: hyped | skeptical | experimental | deep_dive",
          "predicted_click": true
        }
      ]
    }
  ]
}

${hiringSignal ? `CURRENT HIRING SIGNAL (context for "why this matters" lines — do NOT cite as stories):\n\n${hiringSignal}\n\n` : ""}${pastEditions ? `EARLIER THIS WEEK (we sent this reader these stories — you MAY include a brief "callback" line in why_it_matters when today's story is a meaningful continuation of one of them, e.g. "earlier this week we covered X — today's story is the maintainer's response"):\n\n${pastEditions}\n\n` : ""}${pastEditorPicks ? `EDITOR'S PICKS FROM THE PAST 8–30 DAYS (use sparingly — only when today's story is a clear continuation of one of these older picks. Frame as "we covered this back on [date]" or "a callback to last month's pick on …"):\n\n${pastEditorPicks}\n\n` : ""}${letters ? `LETTERS FROM YESTERDAY'S READERS (do NOT cite these as stories; do NOT surface them in why_it_matters; they will be rendered separately in a "Letters" section by the system. You may, however, let their themes subtly influence your editor's note if it fits naturally):\n\n${letters}\n\n` : ""}${readerSignal ? `READER SIGNAL (what this reader has clicked through to in the past 30 days — use as a soft tie-breaker when stories are otherwise equivalent in topic match. Do NOT slavishly echo it; do NOT reference it in why_it_matters):\n\n${readerSignal}\n\n` : ""}POOL:

${poolBlock}`;
}

function summarizePastEditions(editions) {
  if (!Array.isArray(editions) || !editions.length) return "";
  return editions
    .slice(0, 5)
    .map((e) => {
      const headlines = (e.data?.sections || [])
        .flatMap((s) => s.stories || [])
        .slice(0, 4)
        .map((st) => `  · ${st.title}`)
        .join("\n");
      return `[${e.edition_date}] ${e.data?.headline || ""}\n${headlines}`;
    })
    .join("\n\n");
}

/**
 * Compact summary of older editor's-picks for long-horizon callbacks. One line per past edition.
 */
function summarizeReaderSignal(signal) {
  if (!signal || (!signal.top_sources?.length && !signal.top_keywords?.length)) return "";
  const lines = [];
  if (signal.top_sources?.length) {
    lines.push(
      "Sources clicked most: " +
        signal.top_sources.map((s) => `${s.source} (${s.n})`).join(", ")
    );
  }
  if (signal.top_keywords?.length) {
    lines.push(
      "Words appearing in clicked story titles: " +
        signal.top_keywords.map((k) => `${k.word} (${k.n})`).join(", ")
    );
  }
  return lines.join("\n");
}

function summarizeLetters(letters) {
  if (!Array.isArray(letters) || !letters.length) return "";
  return letters
    .map((l) => `  · [${l.author_name || "a reader"}] "${String(l.body).slice(0, 240)}"`)
    .join("\n");
}

function summarizePastEditorPicks(editions) {
  if (!Array.isArray(editions) || !editions.length) return "";
  return editions
    .map((e) => {
      const pickRef = e.data?.editor_pick;
      const pick = pickRef
        ? (e.data?.sections || [])
            .flatMap((s) => s.stories || [])
            .find((st) => st.ref === pickRef)
        : null;
      const title = pick?.title || e.data?.headline || "";
      return title ? `  · [${e.edition_date}] ${title}` : null;
    })
    .filter(Boolean)
    .join("\n");
}

/* ─── Brief generation ────────────────────────────────────── */

/**
 * Generate a brief.
 *
 * Accepted shapes (back-compat):
 *   { topics, depth, sourcePool? }                            -- legacy, treats topics as domains
 *   { role, skillLevel, domains, depth, sourcePool? }         -- new career-intelligence shape
 */
export async function generateBrief(input) {
  const { sourcePool } = input;

  // Normalize input — accept old & new shapes
  const role = input.role || "software_engineer";
  const skillLevel = input.skillLevel || input.skill_level || "intermediate";
  const domains = input.domains || input.topics || [];
  const depth = input.depth || "standard";

  if (!Array.isArray(domains) || domains.length === 0) {
    throw new Error("at least one domain required");
  }

  const pools = sourcePool || (await fetchSourcePool());
  const rawClusters = clusterByUrl(pools);
  const { kept: moderatedClusters } = moderateClusters(rawClusters);
  const clusters = await prefilterPoolByBeats({
    clusters: moderatedClusters,
    role,
    skillLevel,
    domains,
    topN: PREFILTER_TOPN,
  });

  // Fetch HN comments for clusters whose primary kind = hn AND have a substantive discussion
  const hnClustersForComments = clusters
    .filter((c) => c.primary.kind === "hn" && (c.primary.item.comments ?? 0) >= 20)
    .slice(0, 8);

  const commentsEntries = await Promise.all(
    hnClustersForComments.map(async (c) => {
      const comments = await fetchHnComments(c.primary.item.id, 6);
      return [c.primary.ref, comments];
    })
  );
  const commentsByRef = Object.fromEntries(commentsEntries.filter(([, v]) => v.length));

  const hiringSignal = summarizeHiringSignal(pools.whosHiring || [], pools.layoffs || []);
  const pastEditions = summarizePastEditions(input.pastEditions || []);
  const pastEditorPicks = summarizePastEditorPicks(input.pastEditorPicks || []);
  const letters = summarizeLetters(input.letters || []);
  const readerSignal = summarizeReaderSignal(input.readerSignal);

  const prompt = buildPrompt({
    role,
    skillLevel,
    domains,
    depth,
    clusters,
    commentsByRef,
    hiringSignal,
    pastEditions,
    pastEditorPicks,
    letters,
    readerSignal,
    excludeTopics: input.excludeTopics,
    topicWeights: input.topicWeights,
  });

  const resp = await callOpenAIWithRetry(
    () =>
      openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
        response_format: { type: "json_object" },
        max_tokens: 2400,
      }),
    { timeoutMs: 30_000, endpoint: input.endpoint || "/api/brief" }
  );

  logUsage({
    userId: input.userId,
    endpoint: input.endpoint || "/api/brief",
    model: OPENAI_MODEL,
    prompt_tokens: resp.usage?.prompt_tokens,
    completion_tokens: resp.usage?.completion_tokens,
    total_tokens: resp.usage?.total_tokens,
  });

  const raw = resp.choices?.[0]?.message?.content || "";
  let brief;
  try {
    brief = JSON.parse(raw);
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("Model returned non-JSON output");
    brief = JSON.parse(m[0]);
  }

  const variant = await pickVariant();
  const hydrated = hydrateBrief({
    brief,
    clusters,
    pools,
    role,
    skillLevel,
    domains,
    depth,
    lettersRaw: input.letters,
  });
  hydrated.variant_id = variant.id;
  await attachPickDeepDive(hydrated, role, skillLevel);
  return hydrated;
}

/**
 * Mutates the hydrated brief to attach `deep_dive` to whichever story is the editor's pick.
 */
async function attachPickDeepDive(brief, role, skillLevel) {
  if (!brief?.editor_pick) return;
  const pickStory = brief.sections
    .flatMap((s) => s.stories || [])
    .find((st) => st.ref === brief.editor_pick);
  if (!pickStory) return;
  const dd = await writePickDeepDive({ pickStory, role, skillLevel });
  if (dd) pickStory.deep_dive = dd;
}
