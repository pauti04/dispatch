import crypto from "node:crypto";
import OpenAI from "openai";
import dotenv from "dotenv";
import {
  findUsersDueThisHour,
  insertEdition,
  markEditionSent,
  markEditionFailed,
  listRecentEditionsForUser,
  listPastEditorPicksForUser,
  listYesterdayBestLetters,
  getReaderSignal,
  getActiveFounderNote,
  sql,
} from "./db.js";
import { generateBrief, fetchSourcePool } from "./brief.js";
import { track, captureError, events } from "./observability.js";
import { checkDailyCostThreshold } from "./usage.js";
import { sendBriefEmail } from "./email.js";
import { signEditionViewToken } from "./auth.js";
import { scoreBriefAsync } from "./quality.js";
import { postBriefToUserSlacks } from "./slack.js";
import { pushBriefReady } from "./push.js";

dotenv.config();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

function makeSlug() {
  return crypto.randomBytes(6).toString("base64url");
}

function todayInTimezone(tz) {
  // returns YYYY-MM-DD in the given IANA timezone
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export async function runDispatchHour() {
  const dueUsers = await findUsersDueThisHour();
  if (!dueUsers.length) {
    console.log("cron: no users due this hour");
    track("system", events.CRON_RUN, { due: 0, dispatched: 0 });
    return { dispatched: 0 };
  }

  console.log(`cron: ${dueUsers.length} user(s) due — fetching source pool once`);
  let pool;
  let letters;
  let founderNoteAll;
  try {
    [pool, letters, founderNoteAll] = await Promise.all([
      fetchSourcePool(),
      listYesterdayBestLetters(2).catch(() => []),
      getActiveFounderNote({ audience: "all" }).catch(() => null),
    ]);
  } catch (err) {
    console.error("cron: source pool fetch failed:", err.message);
    captureError(err, { source: "cron.fetchSourcePool" });
    return { dispatched: 0, error: err.message };
  }

  let dispatched = 0;
  for (const u of dueUsers) {
    const editionDate = todayInTimezone(u.timezone);
    const slug = makeSlug();

    try {
      const [pastEditions, pastEditorPicks, readerSignal] = await Promise.all([
        listRecentEditionsForUser(u.id, 5).catch(() => []),
        listPastEditorPicksForUser(u.id, 30, 7).catch(() => []),
        getReaderSignal(u.id, 30).catch(() => null),
      ]);
      const brief = await generateBrief({
        role: u.role,
        skillLevel: u.skill_level,
        domains: u.topics,
        depth: u.depth,
        excludeTopics: u.exclude_topics,
        topicWeights: u.topic_weights,
        sourcePool: pool,
        pastEditions,
        pastEditorPicks,
        letters,
        readerSignal,
      });

      // Wave N+ — attach the active founder note to this user's brief.
      // Audience "self" (admin's own test notes) takes priority over the global "all" note.
      const selfNote = await getActiveFounderNote({ audience: "self", userId: u.id }).catch(() => null);
      const note = selfNote || founderNoteAll;
      if (note) brief.founder_note = { body: note.body, at: note.created_at };

      const inserted = await insertEdition({
        userId: u.id,
        editionDate,
        slug,
        data: brief,
      });
      if (!inserted) {
        console.log(`cron: edition for user ${u.id} already exists, skipping`);
        continue;
      }

      const viewToken = signEditionViewToken(inserted.slug, u.id);
      await sendBriefEmail({ user: u, brief, slug: inserted.slug, viewToken });
      await markEditionSent(inserted.id);
      scoreBriefAsync({ brief, editionSlug: inserted.slug, variantId: brief.variant_id }).catch(() => {});
      const appUrl = process.env.APP_URL || "http://localhost:5173";
      postBriefToUserSlacks({
        userId: u.id,
        brief,
        editionUrl: `${appUrl}/edition/${inserted.slug}`,
      }).catch(() => {});
      pushBriefReady({ userId: u.id, brief, editionSlug: inserted.slug }).catch(() => {});
      dispatched++;
      console.log(`cron: dispatched edition ${inserted.slug} to ${u.email}`);
      track(u.id, events.BRIEF_GENERATED, {
        edition_slug: inserted.slug,
        depth: u.depth,
        role: u.role,
        skill_level: u.skill_level,
      });
    } catch (err) {
      console.error(`cron: failed for user ${u.id}:`, err.message);
      captureError(err, { source: "cron.userLoop", user_id: String(u.id) });
      track(u.id, events.BRIEF_GENERATION_FAILED, {
        reason: String(err.message || err).slice(0, 200),
      });
      // We don't have the inserted.id if insert failed before; best-effort mark
      try {
        const row = await findEditionForUserDate(u.id, editionDate);
        if (row) await markEditionFailed(row.id);
      } catch {}
    }
  }

  track("system", events.CRON_RUN, { due: dueUsers.length, dispatched });
  // Fire cost alert (idempotent per UTC day, no-op if webhook unconfigured)
  checkDailyCostThreshold().catch(() => {});
  return { dispatched, total: dueUsers.length };
}

async function findEditionForUserDate(userId, dateIso) {
  const { findEditionForToday } = await import("./db.js");
  return findEditionForToday(userId, dateIso);
}

/* ─── Week-in-Review (Sunday digest) ────────────────────────── */

/**
 * Generates and sends a "what mattered this week" digest to every active user.
 * Reads each user's past 5 weekday editions, asks the LLM to synthesize.
 * Idempotent per user × week (uses a deterministic edition_date of "yyyy-mm-dd-wir").
 */
export async function runWeeklyReview() {
  const users = await sql`
    select id, email, name, timezone, send_days, unsubscribe_token
    from users
    where status = 'active'
  `;
  if (!users.length) {
    console.log("weekly: no active users");
    return { dispatched: 0 };
  }

  let dispatched = 0;
  for (const u of users) {
    try {
      const recent = await listRecentEditionsForUser(u.id, 7);
      if (recent.length < 2) {
        console.log(`weekly: ${u.email} has <2 editions, skipping`);
        continue;
      }

      const digest = await generateWeeklyDigest(recent);
      if (!digest) continue;

      const slug = crypto.randomBytes(6).toString("base64url");
      const editionDate = `${todayInTimezone(u.timezone)}-wir`.slice(0, 10);

      const inserted = await insertEdition({
        userId: u.id,
        editionDate,
        slug,
        data: { ...digest, kind: "week_in_review" },
      });
      if (!inserted) {
        console.log(`weekly: edition already exists for ${u.email}`);
        continue;
      }

      const viewToken = signEditionViewToken(inserted.slug, u.id);
      // Send as a brief email (reuses our template) with a different subject
      const brief = {
        ...digest,
        email_subject: digest.email_subject || "Your week in tech",
        editor_note: digest.editor_note,
        editor_pick: null,
        pull_quote: digest.pull_quote,
        quoted: Array.isArray(digest.quoted) ? digest.quoted.slice(0, 3) : [],
        sections: digest.sections || [],
        counts: { hn: 0, gh: 0, lobsters: 0, reddit: 0, arxiv: 0, show_hn: 0, clusters: 0 },
      };
      await sendBriefEmail({ user: u, brief, slug: inserted.slug, viewToken });
      await markEditionSent(inserted.id);
      dispatched++;
      console.log(`weekly: sent to ${u.email}`);
    } catch (err) {
      console.error(`weekly: failed for user ${u.id}:`, err.message);
    }
  }
  return { dispatched, total: users.length };
}

async function generateWeeklyDigest(editions) {
  const summaries = editions
    .map((e) => {
      const stories = (e.data?.sections || [])
        .flatMap((s) => s.stories || [])
        .slice(0, 6)
        .map((st) => `  - [${st.source}] ${st.title} (${st.url})`)
        .join("\n");
      return `Edition ${e.edition_date}: "${e.data?.headline || ""}"\n${stories}`;
    })
    .join("\n\n");

  // Collect the past week's daily pull quotes for the "Quoted" wrap.
  const weekQuotes = editions
    .map((e) => e.data?.pull_quote)
    .filter(Boolean)
    .slice(0, 7);

  const prompt = `You are the editor of Dispatch, writing a "Week in Review" digest for one reader from their last week's daily briefs. Voice: thoughtful, observed, dry — same retro newspaper editor voice as the daily.

Below are summaries of the reader's daily editions this week. Your job:
1. Identify the 2-4 themes that recurred across days. These are the WEEK'S STORY — not just the loudest day's headline.
2. For each theme, write 2-3 sentences synthesizing what happened and why it matters for their career arc.
3. Pull a sharp pull quote (≤15 words) that captures the week's tension.
4. Write a 2-sentence editor's note that opens the digest.
5. Write a 6-9 word email subject.
6. **Quoted** — from the list of daily pull quotes below, pick the 3 most-worth-revisiting and emit them as a "quoted" array of objects { text, edition_date }. Use the actual quotes verbatim; don't paraphrase. Use the dates from the headers above.

Output ONLY valid JSON:
{
  "headline": "one sentence summarizing the week",
  "email_subject": "your week in tech, in one line",
  "editor_note": "two sentences opening the digest",
  "pull_quote": "a sharp quote (≤15 words)",
  "quoted": [
    { "text": "the daily pull quote, verbatim", "edition_date": "2026-05-17" }
  ],
  "sections": [
    {
      "topic": "Theme name",
      "stories": [
        { "title": "concise theme description", "tldr": "2-3 sentence synthesis", "source": "week" }
      ]
    }
  ]
}

EDITIONS THIS WEEK:

${summaries}

DAILY PULL QUOTES FROM THIS WEEK (for the Quoted wrap):
${weekQuotes.length ? weekQuotes.map((q, i) => `[${editions[i]?.edition_date || "?"}] "${q}"`).join("\n") : "(none)"}`;

  const resp = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.4,
    response_format: { type: "json_object" },
    max_tokens: 1400,
  });
  const raw = resp.choices?.[0]?.message?.content || "";
  try {
    return JSON.parse(raw);
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : null;
  }
}
