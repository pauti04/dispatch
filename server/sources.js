import { parse } from "node-html-parser";

const HN_API = "https://hacker-news.firebaseio.com/v0";
const UA = "dispatch-brief/1.0 (https://dispatch.local)";

export async function fetchHackerNewsTop(limit = 30) {
  const idsRes = await fetch(`${HN_API}/topstories.json`);
  if (!idsRes.ok) throw new Error(`HN topstories ${idsRes.status}`);
  const ids = (await idsRes.json()).slice(0, limit);

  const stories = await Promise.all(
    ids.map(async (id) => {
      try {
        const r = await fetch(`${HN_API}/item/${id}.json`);
        if (!r.ok) return null;
        const s = await r.json();
        if (!s || s.dead || s.deleted) return null;
        return {
          source: "hackernews",
          id: String(s.id),
          title: s.title || "",
          url: s.url || `https://news.ycombinator.com/item?id=${s.id}`,
          hn_url: `https://news.ycombinator.com/item?id=${s.id}`,
          score: s.score || 0,
          comments: s.descendants || 0,
          by: s.by || "",
          time: s.time ? new Date(s.time * 1000).toISOString() : null,
        };
      } catch {
        return null;
      }
    })
  );

  return stories.filter(Boolean);
}

export async function fetchGitHubTrending(since = "daily") {
  const url = `https://github.com/trending?since=${since}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "dispatch-brief/1.0 (+https://github.com)",
      Accept: "text/html",
    },
  });
  if (!res.ok) throw new Error(`GitHub trending ${res.status}`);
  const html = await res.text();
  const root = parse(html);

  const repos = root.querySelectorAll("article.Box-row").slice(0, 20).map((article) => {
    const link = article.querySelector("h2 a");
    const href = link?.getAttribute("href")?.trim() || "";
    const fullName = href.replace(/^\//, "");
    const [owner, name] = fullName.split("/");

    const description = article.querySelector("p")?.text.trim() || "";
    const language = article.querySelector('[itemprop="programmingLanguage"]')?.text.trim() || "";
    const stars = article.querySelector('a[href$="/stargazers"]')?.text.trim().replace(/,/g, "") || "0";
    const starsToday =
      article
        .querySelector(".d-inline-block.float-sm-right")
        ?.text.trim()
        .match(/[\d,]+/)?.[0]
        ?.replace(/,/g, "") || "0";

    return {
      source: "github_trending",
      id: fullName,
      title: fullName,
      owner,
      name,
      description,
      language,
      stars: Number(stars) || 0,
      stars_today: Number(starsToday) || 0,
      url: `https://github.com${href}`,
    };
  });

  return repos.filter((r) => r.owner && r.name);
}

/* ─── HN comments digest ─────────────────────────────────── */

/**
 * Fetch up to `limit` top-level comments for an HN story, sorted by score-ish (HN doesn't expose
 * per-comment score, so we use position + length as a proxy for "substantive"). Returns plain text.
 */
export async function fetchHnComments(storyId, limit = 8) {
  try {
    const itemRes = await fetch(`${HN_API}/item/${storyId}.json`);
    if (!itemRes.ok) return [];
    const item = await itemRes.json();
    const kidIds = (item?.kids || []).slice(0, limit * 2);
    if (!kidIds.length) return [];

    const kids = await Promise.all(
      kidIds.map(async (kid) => {
        try {
          const r = await fetch(`${HN_API}/item/${kid}.json`);
          if (!r.ok) return null;
          const c = await r.json();
          if (!c || c.dead || c.deleted || !c.text) return null;
          return {
            id: c.id,
            by: c.by || "anon",
            text: stripHtml(c.text).slice(0, 400),
            len: c.text.length,
          };
        } catch {
          return null;
        }
      })
    );

    return kids
      .filter(Boolean)
      .sort((a, b) => b.len - a.len) // prefer meatier comments
      .slice(0, limit)
      .map((c) => `[${c.by}] ${c.text}`);
  } catch {
    return [];
  }
}

function stripHtml(s) {
  return String(s || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/* ─── Lobsters ───────────────────────────────────────────── */

export async function fetchLobsters(limit = 20) {
  try {
    const r = await fetch("https://lobste.rs/hottest.json", {
      headers: { "User-Agent": UA, Accept: "application/json" },
    });
    if (!r.ok) return [];
    const items = await r.json();
    return items.slice(0, limit).map((it) => ({
      source: "lobsters",
      id: String(it.short_id),
      title: it.title || "",
      url: it.url || it.comments_url,
      lobsters_url: it.comments_url,
      score: it.score || 0,
      comments: it.comment_count || 0,
      by: it.submitter_user || "",
      tags: it.tags || [],
      time: it.created_at || null,
    }));
  } catch {
    return [];
  }
}

/* ─── Reddit ─────────────────────────────────────────────── */

export async function fetchReddit(subs = ["programming", "MachineLearning"], limitPerSub = 12) {
  const all = await Promise.all(subs.map((sub) => fetchSubreddit(sub, limitPerSub)));
  return all.flat();
}

async function fetchSubreddit(sub, limit) {
  try {
    const r = await fetch(`https://www.reddit.com/r/${sub}/top.json?t=day&limit=${limit}`, {
      headers: { "User-Agent": UA, Accept: "application/json" },
    });
    if (!r.ok) return [];
    const json = await r.json();
    const posts = json?.data?.children || [];
    return posts
      .map((p) => p.data)
      .filter((p) => p && !p.stickied && !p.over_18)
      .map((p) => ({
        source: "reddit",
        id: p.id,
        subreddit: sub,
        title: p.title || "",
        url: p.url_overridden_by_dest || p.url || `https://reddit.com${p.permalink}`,
        reddit_url: `https://reddit.com${p.permalink}`,
        score: p.score || 0,
        comments: p.num_comments || 0,
        by: p.author || "",
        time: p.created_utc ? new Date(p.created_utc * 1000).toISOString() : null,
      }));
  } catch {
    return [];
  }
}

/* ─── arXiv (AI/ML research papers) ──────────────────────── */

/**
 * Pulls recent submissions from arXiv categories. Default focus: cs.LG (ML), cs.AI, cs.CL (NLP).
 * Uses the public Atom-style query API. No key needed. Returns up to `limit` items per category, merged.
 */
export async function fetchArxivNew(categories = ["cs.LG", "cs.AI", "cs.CL"], limit = 15) {
  try {
    const cats = categories.join("+OR+cat:");
    const url = `http://export.arxiv.org/api/query?search_query=cat:${cats}&sortBy=submittedDate&sortOrder=descending&max_results=${limit}`;
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseArxivAtom(xml).map((p) => ({
      source: "arxiv",
      id: p.id,
      title: p.title,
      url: p.link,
      abstract_pdf: p.pdf,
      summary: p.summary,
      authors: p.authors,
      categories: p.categories,
      published: p.published,
      // give it a "score" proxy so it can be ranked next to HN/Reddit items if needed
      score: 0,
      comments: 0,
    }));
  } catch {
    return [];
  }
}

function parseArxivAtom(xml) {
  const out = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let m;
  while ((m = entryRegex.exec(xml)) !== null) {
    const block = m[1];
    const get = (tag) => {
      const r = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
      const mm = block.match(r);
      return mm ? mm[1].trim() : "";
    };
    const id = get("id");
    const title = decodeEntities(get("title")).replace(/\s+/g, " ").trim();
    const summary = decodeEntities(get("summary")).replace(/\s+/g, " ").trim().slice(0, 500);
    const published = get("published");
    const authors = [];
    const authorRegex = /<author>\s*<name>([^<]+)<\/name>/g;
    let am;
    while ((am = authorRegex.exec(block)) !== null) authors.push(am[1].trim());
    const categories = [];
    const catRegex = /<category[^>]*term="([^"]+)"/g;
    let cm;
    while ((cm = catRegex.exec(block)) !== null) categories.push(cm[1]);
    // links
    let link = id;
    let pdf = null;
    const linkRegex = /<link[^>]*\/?>/g;
    let lm;
    while ((lm = linkRegex.exec(block)) !== null) {
      const lTag = lm[0];
      const href = (lTag.match(/href="([^"]+)"/) || [])[1];
      const type = (lTag.match(/type="([^"]+)"/) || [])[1];
      const rel = (lTag.match(/rel="([^"]+)"/) || [])[1];
      if (rel === "alternate" || (!rel && type === "text/html")) link = href;
      if (type === "application/pdf") pdf = href;
    }
    out.push({
      id,
      title,
      summary,
      link,
      pdf,
      authors: authors.slice(0, 4),
      categories,
      published,
    });
  }
  return out;
}

function decodeEntities(s) {
  return String(s || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

/* ─── Show HN (launches / new products from the HN stream) ─ */

/**
 * Uses Algolia's HN Search to grab top "Show HN:" posts from the last 7 days.
 * Algolia HN search is free, no key. Great signal for what makers are building.
 */
export async function fetchShowHN(limit = 15) {
  try {
    const since = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000);
    const url = `https://hn.algolia.com/api/v1/search?tags=show_hn&numericFilters=created_at_i>${since}&hitsPerPage=${limit}`;
    const r = await fetch(url, { headers: { "User-Agent": UA } });
    if (!r.ok) return [];
    const json = await r.json();
    return (json.hits || [])
      .map((h) => ({
        source: "show_hn",
        id: String(h.objectID),
        title: (h.title || "").replace(/^Show HN:\s*/i, ""),
        url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
        hn_url: `https://news.ycombinator.com/item?id=${h.objectID}`,
        score: h.points || 0,
        comments: h.num_comments || 0,
        by: h.author || "",
        time: h.created_at || null,
      }))
      .filter((s) => s.url);
  } catch {
    return [];
  }
}

/* ─── Hiring signal: HN "Who's Hiring" monthly thread ────── */

/**
 * Pulls top-level comments from the current month's "Ask HN: Who is hiring?" thread.
 * Each comment is one job posting. We sample them to extract company + role signal that
 * the LLM can fold into "what's hiring this week" framing in the brief.
 */
export async function fetchWhosHiring(limit = 30) {
  try {
    // Find the most recent Who's Hiring thread via Algolia HN Search
    const searchUrl =
      "https://hn.algolia.com/api/v1/search?query=Ask%20HN%20Who%20is%20hiring&tags=story&restrictSearchableAttributes=title&hitsPerPage=5";
    const sr = await fetch(searchUrl, { headers: { "User-Agent": UA } });
    if (!sr.ok) return [];
    const sjson = await sr.json();
    const thread = (sjson.hits || []).find((h) => /^Ask HN: Who is hiring/i.test(h.title));
    if (!thread) return [];

    // Pull the thread's top-level comments via Algolia (faster than HN Firebase tree walk)
    const cUrl = `https://hn.algolia.com/api/v1/search?tags=comment,story_${thread.objectID}&hitsPerPage=${limit}`;
    const cr = await fetch(cUrl, { headers: { "User-Agent": UA } });
    if (!cr.ok) return [];
    const cjson = await cr.json();

    const postings = (cjson.hits || [])
      .map((h) => {
        const text = stripHtml(h.comment_text || "").slice(0, 600);
        // Try to extract "Company | Role | Location" from the typical posting format
        const firstLine = text.split("\n")[0]?.slice(0, 200) || "";
        return {
          source: "whos_hiring",
          id: String(h.objectID),
          title: firstLine,
          full_text: text,
          url: `https://news.ycombinator.com/item?id=${h.objectID}`,
          score: 0,
          comments: 0,
          time: h.created_at || null,
        };
      })
      .filter((p) => p.title.length > 10);

    return postings;
  } catch {
    return [];
  }
}

/* ─── Hiring signal: Layoffs.fyi ─────────────────────────── */

/**
 * Layoffs.fyi exposes their dataset on a Google Sheet. We hit a small JSON cache of recent
 * layoffs they expose at layoffs.fyi/data. If their endpoint is down or the shape changes,
 * the fetcher silently returns []; brief generation degrades gracefully.
 */
export async function fetchLayoffsFyi(limit = 15) {
  try {
    const r = await fetch("https://layoffs.fyi/api/data", {
      headers: { "User-Agent": UA, Accept: "application/json" },
    });
    if (!r.ok) return [];
    const j = await r.json();
    const items = Array.isArray(j) ? j : Array.isArray(j?.data) ? j.data : [];
    return items.slice(0, limit).map((it, idx) => ({
      source: "layoffs_fyi",
      id: `layoff-${idx}`,
      company: it.company || it.Company || "",
      title: `${it.company || it.Company || "Company"} — ${it.laid_off || it.LaidOff || "?"} layoffs`,
      industry: it.industry || it.Industry || "",
      location: it.location || it.Location || "",
      date: it.date || it.Date || null,
      url: it.source || it.Source || "https://layoffs.fyi/",
      score: 0,
      comments: 0,
    }));
  } catch {
    return [];
  }
}

/* ─── URL canonicalization (for cross-source dedup) ──────── */

export function canonicalUrl(url) {
  if (!url) return "";
  try {
    const u = new URL(url);
    // strip tracking params
    const stripParams = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "ref", "ref_src"];
    stripParams.forEach((p) => u.searchParams.delete(p));
    // normalize host
    let host = u.hostname.toLowerCase().replace(/^www\./, "");
    // normalize path (drop trailing slash, drop common index files)
    let path = u.pathname.replace(/\/$/, "").replace(/\/index\.html?$/, "");
    return `${host}${path}${u.search}`;
  } catch {
    return url.toLowerCase();
  }
}
