import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import crypto from "node:crypto";
import rateLimit from "express-rate-limit";
import { initObservability, captureError, flush as flushPosthog, Sentry } from "./observability.js";
import { generateBrief, generateBriefStream } from "./brief.js";
import { scoreBriefAsync } from "./quality.js";
import { renderEditionOG, renderStoryOG } from "./og.js";
import { synthesizeBriefAudio } from "./tts.js";
import { getEditionBySlug, getUserByHandle, listPublicBookmarksForUser, discoverThisWeek } from "./db.js";
import { readSessionCookie, verifyEditionViewToken } from "./auth.js";
import { getBeat, listBeats } from "./beats.js";
import { renderBeatPage } from "./beat-render.js";
import authRouter from "./routes/auth.js";
import meRouter from "./routes/me.js";
import editionsRouter from "./routes/editions.js";
import unsubscribeRouter from "./routes/unsubscribe.js";
import cronRouter from "./routes/cron.js";
import bookmarksRouter from "./routes/bookmarks.js";
import feedRouter from "./routes/feed.js";
import invitesRouter from "./routes/invites.js";
import lettersRouter from "./routes/letters.js";
import trackRouter from "./routes/track.js";
import interestRouter from "./routes/interest.js";
import reportsRouter from "./routes/reports.js";
import adminRouter from "./routes/admin.js";
import slackRouter from "./routes/slack.js";
import pushRouter from "./routes/push.js";
import { renderReportPage } from "./report-render.js";
import { getReportBySlug, listRecentReports } from "./db.js";

dotenv.config();

// Wave N Day 1 — Sentry + PostHog must init before the Express app so request handlers
// are wrapped by Sentry's middleware.
initObservability();

const app = express();
const PORT = process.env.PORT || 5180;
const APP_URL = process.env.APP_URL || "http://localhost:5173";

app.use(
  cors({
    origin: [APP_URL, "http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const limiter = rateLimit({ windowMs: 60 * 1000, max: 30 });
app.use("/api/", limiter);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

/* ─── Sample editions per role (Wave M.2 — pre-warmed cache) ─

  Each "role" has a curated default beat set. We cache the generated brief per role,
  so when a visitor lands on /demo or picks a role on /try the response is typically
  <500ms instead of 8–12s. On server boot, prewarmAllRoles() generates the default role
  (software_engineer) in the background — others fill in lazily on first request and
  refresh every 6h.
*/

const ROLE_DEFAULTS = {
  software_engineer: {
    skill: "intermediate",
    domains: ["Backend Development", "DevOps & Infra", "Developer Tools", "Open Source"],
  },
  ml_engineer: {
    skill: "intermediate",
    domains: ["ML Engineering", "LLM Applications", "AI Research", "Developer Tools"],
  },
  data_engineer: {
    skill: "intermediate",
    domains: ["Data Engineering", "Backend Development", "DevOps & Infra", "Open Source"],
  },
  security_pro: {
    skill: "intermediate",
    domains: ["Cybersecurity", "DevOps & Infra", "Backend Development", "Open Source"],
  },
  devops_sre: {
    skill: "intermediate",
    domains: ["DevOps & Infra", "Cloud Architecture", "Developer Tools", "Backend Development"],
  },
  ml_learner: {
    skill: "beginner",
    domains: ["AI Research", "ML Engineering", "LLM Applications", "Developer Tools"],
  },
  cs_student: {
    skill: "beginner",
    domains: ["AI Research", "Backend Development", "Developer Tools", "Startup & Career Signal"],
  },
  engineering_manager: {
    skill: "advanced",
    domains: ["ML Engineering", "Backend Development", "Developer Tools", "Startup & Career Signal"],
  },
};
const DEFAULT_SAMPLE_ROLE = "software_engineer";
const SAMPLE_DEPTH = "standard";
const SAMPLE_TTL_MS = 6 * 60 * 60 * 1000;

// roleId -> { at, brief, inflight }
const sampleCacheByRole = new Map();

function resolveRoleConfig(roleId) {
  const id = ROLE_DEFAULTS[roleId] ? roleId : DEFAULT_SAMPLE_ROLE;
  const cfg = ROLE_DEFAULTS[id];
  return { roleId: id, skill: cfg.skill, domains: cfg.domains };
}

async function getSampleForRole(roleId) {
  const { roleId: resolved, skill, domains } = resolveRoleConfig(roleId);
  const hit = sampleCacheByRole.get(resolved);
  if (hit?.brief && Date.now() - hit.at < SAMPLE_TTL_MS) return hit.brief;
  if (hit?.inflight) return hit.inflight;
  const promise = (async () => {
    const brief = await generateBrief({
      role: resolved,
      skillLevel: skill,
      domains,
      depth: SAMPLE_DEPTH,
    });
    sampleCacheByRole.set(resolved, { at: Date.now(), brief, inflight: null });
    return brief;
  })();
  sampleCacheByRole.set(resolved, { at: hit?.at || 0, brief: hit?.brief || null, inflight: promise });
  return promise;
}

// Backwards-compatible /api/sample — default role brief
app.get("/api/sample", async (_req, res) => {
  try {
    const brief = await getSampleForRole(DEFAULT_SAMPLE_ROLE);
    res.json({ ...brief, cached: true });
  } catch (err) {
    console.error("sample error:", err);
    res.status(500).json({ error: String(err.message || err) });
  }
});

// New per-role endpoint (Wave M.2). Falls back to the default role config when unknown.
app.get("/api/sample/by-role", async (req, res) => {
  try {
    const roleId = String(req.query.role || DEFAULT_SAMPLE_ROLE);
    const brief = await getSampleForRole(roleId);
    res.json({ ...brief, role_used: resolveRoleConfig(roleId).roleId, cached: true });
  } catch (err) {
    console.error("sample by-role error:", err);
    res.status(500).json({ error: String(err.message || err) });
  }
});

// Kick off a background pre-warm of the default role at server boot so the very first
// visitor to /demo or / gets the cached brief instantly. Doesn't await — boot continues.
async function prewarmDefaultSample() {
  try {
    console.log("prewarm: generating default sample…");
    await getSampleForRole(DEFAULT_SAMPLE_ROLE);
    console.log("prewarm: default sample ready.");
  } catch (err) {
    console.warn("prewarm failed (non-fatal):", err.message || err);
  }
}

/* ─── Anonymous try-before-signup brief ────────────────────── */

const briefCache = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000;
function cacheKey(topics, depth) {
  return `${[...topics].sort().join(",")}::${depth}`;
}

/* ─── Streaming brief generation (SSE) ─────────────────────── */
app.post("/api/brief/stream", async (req, res) => {
  const { role, skill_level, domains, topics, depth, exclude_topics, topic_weights } = req.body || {};
  const effectiveDomains = Array.isArray(domains) && domains.length ? domains : topics;
  if (!Array.isArray(effectiveDomains) || effectiveDomains.length === 0)
    return res.status(400).json({ error: "domains (or topics) must be a non-empty array" });
  if (!["skim", "standard", "deep"].includes(depth))
    return res.status(400).json({ error: "depth must be 'skim', 'standard', or 'deep'" });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  const send = (event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  let closed = false;
  req.on("close", () => {
    closed = true;
  });

  try {
    send("start", { at: new Date().toISOString() });

    await generateBriefStream(
      {
        role,
        skillLevel: skill_level,
        domains: effectiveDomains,
        depth,
        excludeTopics: exclude_topics,
        topicWeights: topic_weights,
      },
      {
        onDelta: (chunk) => {
          if (closed) return;
          send("delta", { chunk });
        },
        onComplete: (brief) => {
          if (closed) return;
          send("complete", brief);
          scoreBriefAsync({ brief, requestId: crypto.randomBytes(6).toString("hex"), variantId: brief.variant_id }).catch(() => {});
        },
      }
    );
  } catch (err) {
    console.error("stream error:", err);
    if (!closed) send("error", { message: String(err.message || err) });
  } finally {
    if (!closed) res.end();
  }
});

app.post("/api/brief", async (req, res) => {
  try {
    const { role, skill_level, domains, topics, depth, force, exclude_topics, topic_weights } =
      req.body || {};

    // Accept either the new {role, skill_level, domains} shape or legacy {topics}
    const effectiveDomains = Array.isArray(domains) && domains.length ? domains : topics;
    if (!Array.isArray(effectiveDomains) || effectiveDomains.length === 0)
      return res.status(400).json({ error: "domains (or topics) must be a non-empty array" });
    if (!["skim", "standard", "deep"].includes(depth))
      return res.status(400).json({ error: "depth must be 'skim', 'standard', or 'deep'" });

    const cacheSig = `${role || "_"}|${skill_level || "_"}|${(exclude_topics || []).join(",")}|${JSON.stringify(topic_weights || {})}`;
    const key = `${cacheSig}|${cacheKey(effectiveDomains, depth)}`;
    if (!force) {
      const hit = briefCache.get(key);
      if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
        return res.json({ ...hit.value, cached: true });
      }
    }
    const brief = await generateBrief({
      role,
      skillLevel: skill_level,
      domains: effectiveDomains,
      depth,
      excludeTopics: exclude_topics,
      topicWeights: topic_weights,
    });
    briefCache.set(key, { at: Date.now(), value: brief });
    if (briefCache.size > 50) {
      const oldest = [...briefCache.entries()].sort((a, b) => a[1].at - b[1].at)[0]?.[0];
      if (oldest) briefCache.delete(oldest);
    }
    // Fire-and-forget quality scoring — never blocks the response
    scoreBriefAsync({ brief, requestId: crypto.randomBytes(6).toString("hex"), variantId: brief.variant_id }).catch(() => {});
    res.json({ ...brief, cached: false });
  } catch (err) {
    console.error("brief error:", err);
    res.status(500).json({ error: String(err.message || err) });
  }
});

/* ─── Routes ───────────────────────────────────────────────── */

/* ─── OG image generator (PNG) ─────────────────────────────── */
const OG_TTL_MS = 24 * 60 * 60 * 1000;
const ogCache = new Map();

app.get("/api/og/:slug.png", async (req, res) => {
  try {
    const slug = req.params.slug;
    const hit = ogCache.get(slug);
    if (hit && Date.now() - hit.at < OG_TTL_MS) {
      res.set("Content-Type", "image/png");
      res.set("Cache-Control", "public, max-age=86400");
      return res.send(hit.buf);
    }
    const edition = await getEditionBySlug(slug);
    if (!edition) return res.status(404).send("not found");

    const buf = await renderEditionOG({
      headline: edition.data?.headline,
      edition_date: edition.edition_date,
      role: edition.data?.role,
    });
    ogCache.set(slug, { at: Date.now(), buf });
    if (ogCache.size > 100) {
      const oldest = [...ogCache.entries()].sort((a, b) => a[1].at - b[1].at)[0]?.[0];
      if (oldest) ogCache.delete(oldest);
    }
    res.set("Content-Type", "image/png");
    res.set("Cache-Control", "public, max-age=86400");
    res.send(buf);
  } catch (err) {
    console.error("og error:", err);
    res.status(500).send("og generation failed");
  }
});

/* ─── Public beat landing pages (SEO) ──────────────────────── */
const BEAT_TTL_MS = 6 * 60 * 60 * 1000;
const beatCache = new Map(); // beatId -> { at, brief }

app.get("/beats", (_req, res) => {
  const items = listBeats()
    .map(
      (b) =>
        `<li><a href="/beats/${b.id}"><strong>Dispatch · ${b.name}</strong> — ${b.tagline}</a></li>`
    )
    .join("");
  const appUrl = process.env.APP_URL || `${_req?.protocol || "http"}://${_req?.get?.("host") || "localhost"}`;
  res.set("Content-Type", "text/html; charset=utf-8");
  res.send(`<!doctype html><html><head><meta charset="UTF-8"><title>Dispatch — sections</title>
  <meta name="description" content="Daily career-intelligence briefs by beat. AI-curated from HackerNews, GitHub Trending, arXiv, and more.">
  <style>body{font-family:Georgia,serif;background:#0d0c0a;color:#f4ecdc;max-width:680px;margin:0 auto;padding:64px 24px;line-height:1.7}h1{font-family:'DM Serif Display',Georgia,serif;font-size:48px}a{color:#c9a14a;text-decoration:none}li{margin:10px 0}</style>
  </head><body>
  <h1>Dispatch · Sections</h1>
  <p>Daily AI-curated career-intelligence briefs, by beat:</p>
  <ul>${items}</ul>
  <p style="margin-top:48px"><a href="${appUrl}/">← Back to Dispatch</a></p>
  </body></html>`);
});

app.get("/beats/:slug", async (req, res) => {
  try {
    const beat = getBeat(req.params.slug);
    if (!beat) return res.status(404).type("text").send("beat not found");

    const appUrl = process.env.APP_URL || "http://localhost:5173";

    // Lazy generation with cache
    let brief;
    const hit = beatCache.get(beat.id);
    if (hit && Date.now() - hit.at < BEAT_TTL_MS) {
      brief = hit.brief;
    } else {
      brief = await generateBrief({
        role: beat.role,
        skillLevel: beat.skill_level,
        domains: beat.domains,
        depth: "standard",
      });
      beatCache.set(beat.id, { at: Date.now(), brief });
    }

    // The OG image endpoint is keyed off a slug; reuse it for the beat by giving it a fabricated
    // pseudo-slug. We'll fall back to the basic landing OG if generation fails.
    const ogUrl = `${appUrl}/api/og/beats/${beat.id}.png`;

    const html = renderBeatPage({ beat, brief, appUrl, ogUrl });
    res.set("Content-Type", "text/html; charset=utf-8");
    res.set("Cache-Control", "public, max-age=900");
    res.send(html);
  } catch (err) {
    console.error("beat page error:", err.message);
    res.status(500).type("text").send("beat page failed");
  }
});

/* ─── Public bookmark profile (SSR'd) ──────────────────────── */
const SOURCE_LABEL = {
  hackernews: "HackerNews",
  github_trending: "GitHub",
  lobsters: "Lobsters",
  reddit: "Reddit",
  arxiv: "arXiv",
  show_hn: "Show HN",
};

app.get("/p/:handle", async (req, res) => {
  try {
    const handle = String(req.params.handle || "").toLowerCase();
    const user = await getUserByHandle(handle);
    if (!user) return res.status(404).type("text").send("not found");

    const bookmarks = await listPublicBookmarksForUser(user.id, 100);
    const appUrl = process.env.APP_URL || "http://localhost:5173";
    const title = `@${esc(handle)}'s clippings — Dispatch`;
    const description =
      bookmarks.length
        ? `${bookmarks.length} stories @${handle} has saved on Dispatch · Tech.`
        : `@${handle} is on Dispatch · Tech. No public clippings yet.`;
    const ogUrl = `${req.protocol}://${req.get("host")}/api/og/profile-${encodeURIComponent(handle)}.png`;

    const items = bookmarks.length
      ? bookmarks
          .map(
            (b) => `
        <li>
          <div class="bm-meta">${esc(SOURCE_LABEL[b.source] || "Source")} &middot; saved ${esc(new Date(b.saved_at).toLocaleDateString())}</div>
          <a class="bm-title" href="${esc(b.story_url)}" target="_blank" rel="noreferrer">${esc(b.title)}</a>
        </li>`
          )
          .join("")
      : `<li class="empty">No public clippings yet.</li>`;

    res.set("Content-Type", "text/html; charset=utf-8");
    res.set("Cache-Control", "public, max-age=300");
    res.send(`<!doctype html>
<html lang="en"><head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
<meta property="og:type" content="profile" />
<meta property="og:site_name" content="Dispatch" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:image" content="${esc(ogUrl)}" />
<meta property="og:url" content="${esc(appUrl)}/p/${esc(handle)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(description)}" />
<meta name="twitter:image" content="${esc(ogUrl)}" />
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Crimson+Pro:ital,wght@0,400;1,400&family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
<style>
  body{margin:0;background:#0d0c0a;color:#f4ecdc;font-family:'Crimson Pro',Georgia,serif;line-height:1.65}
  a{color:inherit}
  .wrap{max-width:640px;margin:0 auto;padding:64px 24px 96px}
  .kicker{font-family:Inter,system-ui,sans-serif;font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#a89c84;font-weight:600}
  .masthead{text-align:center;padding-bottom:24px;border-bottom:1px solid #3a3530}
  .masthead h1{font-family:'DM Serif Display',Georgia,serif;font-size:64px;margin:8px 0 4px}
  .handle{font-family:Inter,system-ui,sans-serif;font-size:14px;letter-spacing:0.18em;text-transform:uppercase;color:#c9a14a;margin-top:8px}
  .role-line{font-family:'Crimson Pro',Georgia,serif;font-style:italic;color:#d9cfba;margin-top:8px}
  ul{list-style:none;padding:0;margin:36px 0}
  li{padding:16px 0;border-bottom:1px solid #3a3530}
  .bm-meta{font-family:Inter,system-ui,sans-serif;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#a89c84;margin-bottom:6px}
  .bm-title{font-family:'DM Serif Display',Georgia,serif;font-size:21px;line-height:1.2;color:#f4ecdc;text-decoration:none}
  .bm-title:hover{color:#c9a14a}
  .empty{font-style:italic;color:#a89c84;text-align:center;padding:48px 0;border-bottom:none}
  .colophon{text-align:center;color:#a89c84;font-size:12px;margin-top:64px;font-style:italic}
  .colophon a{color:#c9a14a;text-decoration:none}
</style>
</head><body>
<div class="wrap">
  <header class="masthead">
    <h1>Dispatch</h1>
    <div class="handle">@${esc(handle)}</div>
    ${user.role ? `<div class="role-line">${esc(user.role.replace(/_/g, " "))}${user.skill_level ? `, ${esc(user.skill_level)}` : ""}</div>` : ""}
    <div class="kicker" style="margin-top:18px">${bookmarks.length} clipping${bookmarks.length === 1 ? "" : "s"}</div>
  </header>

  <ul>${items}</ul>

  <div class="colophon">
    @${esc(handle)} reads <a href="${esc(appUrl)}/">Dispatch · Tech</a>. You can subscribe too.
  </div>
</div>
</body></html>`);
  } catch (err) {
    console.error("profile page error:", err.message);
    res.status(500).type("text").send("profile failed");
  }
});

/* ─── Discover feed (JSON) ─────────────────────────────────── */
let discoverCache = { at: 0, data: null };
const DISCOVER_TTL_MS = 60 * 60 * 1000;

app.get("/api/discover/this-week", async (_req, res) => {
  try {
    if (discoverCache.data && Date.now() - discoverCache.at < DISCOVER_TTL_MS) {
      return res.json({ ...discoverCache.data, cached: true });
    }
    const rows = await discoverThisWeek(7, 20);
    const data = { stories: rows, generated_at: new Date().toISOString() };
    discoverCache = { at: Date.now(), data };
    res.json({ ...data, cached: false });
  } catch (err) {
    console.error("discover error:", err.message);
    res.status(500).json({ error: "could not load discover" });
  }
});

/* ─── Public Dispatch Reports (SSR'd) ──────────────────────── */

app.get("/reports", async (req, res) => {
  try {
    const appUrl = process.env.APP_URL || "http://localhost:5173";
    const rows = await listRecentReports(30);
    const items = rows.length
      ? rows
          .map(
            (r) => `<li style="margin:18px 0;padding-bottom:18px;border-bottom:1px solid #3a3530">
              <a href="/reports/${esc(r.slug)}" style="text-decoration:none;color:inherit">
                <div style="font-family:Inter,system-ui,sans-serif;font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#c9a14a">${esc(r.topic || "Dispatch Reports")}${r.published_at ? ` · ${new Date(r.published_at).toLocaleDateString()}` : ""}</div>
                <div style="font-family:'DM Serif Display',Georgia,serif;font-size:28px;line-height:1.18;margin:6px 0 4px;color:#f4ecdc">${esc(r.title)}</div>
                ${r.subtitle ? `<div style="font-family:'Crimson Pro',Georgia,serif;font-style:italic;color:#d9cfba">${esc(r.subtitle)}</div>` : ""}
              </a>
            </li>`
          )
          .join("")
      : `<li style="font-family:'Crimson Pro',Georgia,serif;font-style:italic;color:#a89c84">No reports yet.</li>`;

    res.set("Content-Type", "text/html; charset=utf-8");
    res.send(`<!doctype html><html><head><meta charset="UTF-8"><title>Dispatch Reports</title>
<meta name="description" content="Occasional long-form Dispatch Reports synthesized from a week of editions.">
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Crimson+Pro:ital,wght@0,400;0,500;1,400&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
<style>body{font-family:'Crimson Pro',Georgia,serif;background:#0d0c0a;color:#f4ecdc;max-width:680px;margin:0 auto;padding:64px 24px;line-height:1.65}h1{font-family:'DM Serif Display',Georgia,serif;font-size:56px;margin:0 0 16px}a{color:inherit}ul{list-style:none;padding:0;margin:32px 0}.back{color:#c9a14a;text-decoration:none;font-family:Inter,system-ui,sans-serif;font-size:11px;letter-spacing:0.18em;text-transform:uppercase}</style>
</head><body>
<h1>Dispatch <span style="color:#c9a14a">·</span> Reports</h1>
<p style="font-family:'Crimson Pro',Georgia,serif;font-style:italic;color:#d9cfba;max-width:32rem">Long-form pieces synthesized from a week of daily editions. Occasional, careful, careerist.</p>
<ul>${items}</ul>
<p style="margin-top:48px"><a href="${esc(appUrl)}/" class="back">← Back to Dispatch</a></p>
</body></html>`);
  } catch (err) {
    console.error("reports index error:", err.message);
    res.status(500).type("text").send("reports index failed");
  }
});

app.get("/reports/:slug", async (req, res) => {
  try {
    const report = await getReportBySlug(req.params.slug);
    if (!report) return res.status(404).type("text").send("report not found");
    const appUrl = process.env.APP_URL || "http://localhost:5173";
    const ogUrl = `${req.protocol}://${req.get("host")}/api/og/reports/${encodeURIComponent(report.slug)}.png`;
    const html = renderReportPage({ report, appUrl, ogUrl });
    res.set("Content-Type", "text/html; charset=utf-8");
    res.set("Cache-Control", "public, max-age=600");
    res.send(html);
  } catch (err) {
    console.error("report render error:", err.message);
    res.status(500).type("text").send("report render failed");
  }
});

// Report OG image (reuses edition OG renderer with the report headline)
app.get("/api/og/reports/:slug.png", async (req, res) => {
  try {
    const report = await getReportBySlug(req.params.slug);
    if (!report) return res.status(404).send("not found");
    const buf = await renderEditionOG({
      headline: report.title,
      edition_date: report.published_at,
      role: report.topic,
    });
    res.set("Content-Type", "image/png");
    res.set("Cache-Control", "public, max-age=21600");
    res.send(buf);
  } catch (err) {
    console.error("report og error:", err.message);
    res.status(500).send("og failed");
  }
});

// Beat OG image — uses the cached beat brief, falls back to a static beat card.
// Path is `/api/og/beats/:slug.png` (not `/api/og/beat-...`) so it doesn't collide with the
// generic edition OG route `/api/og/:slug.png`.
app.get("/api/og/beats/:slug.png", async (req, res) => {
  try {
    const beat = getBeat(req.params.slug);
    if (!beat) return res.status(404).send("not found");
    const hit = beatCache.get(beat.id);
    const headline = hit?.brief?.headline || beat.tagline;
    const buf = await renderEditionOG({
      headline,
      edition_date: new Date().toISOString().slice(0, 10),
      role: beat.role,
    });
    res.set("Content-Type", "image/png");
    res.set("Cache-Control", "public, max-age=21600");
    res.send(buf);
  } catch (err) {
    console.error("beat og error:", err.message);
    res.status(500).send("og failed");
  }
});

/* ─── Audio edition (MP3) ──────────────────────────────────── */
const AUDIO_TTL_MS = 24 * 60 * 60 * 1000;
const audioCache = new Map();

app.get("/api/editions/:slug/audio.mp3", async (req, res) => {
  try {
    const slug = req.params.slug;
    const edition = await getEditionBySlug(slug);
    if (!edition) return res.status(404).send("not found");

    // Access check: owner via session cookie OR valid edition view token
    const sessionUserId = readSessionCookie(req);
    let ok = sessionUserId === edition.user_id;
    if (!ok && req.query.t) {
      const payload = verifyEditionViewToken(String(req.query.t));
      ok = payload && payload.slug === slug && payload.sub === edition.user_id;
    }
    if (!ok) return res.status(403).send("forbidden");

    const hit = audioCache.get(slug);
    if (hit && Date.now() - hit.at < AUDIO_TTL_MS) {
      res.set("Content-Type", "audio/mpeg");
      res.set("Cache-Control", "private, max-age=86400");
      return res.send(hit.buf);
    }

    const { buffer } = await synthesizeBriefAudio(edition.data);
    audioCache.set(slug, { at: Date.now(), buf: buffer });
    if (audioCache.size > 40) {
      const oldest = [...audioCache.entries()].sort((a, b) => a[1].at - b[1].at)[0]?.[0];
      if (oldest) audioCache.delete(oldest);
    }
    res.set("Content-Type", "audio/mpeg");
    res.set("Cache-Control", "private, max-age=86400");
    res.send(buffer);
  } catch (err) {
    console.error("audio error:", err.message);
    res.status(500).send("audio generation failed");
  }
});

/* ─── Per-story share landing + OG image ───────────────────── */

const storyOgCache = new Map();

app.get("/api/og/:slug/:ref.png", async (req, res) => {
  try {
    const { slug, ref } = req.params;
    const key = `${slug}::${ref}`;
    const hit = storyOgCache.get(key);
    if (hit && Date.now() - hit.at < OG_TTL_MS) {
      res.set("Content-Type", "image/png");
      res.set("Cache-Control", "public, max-age=86400");
      return res.send(hit.buf);
    }
    const edition = await getEditionBySlug(slug);
    if (!edition) return res.status(404).send("not found");
    const story = (edition.data?.sections || []).flatMap((s) => s.stories || []).find((st) => st.ref === ref);
    if (!story) return res.status(404).send("story not found");

    const buf = await renderStoryOG({
      title: story.title,
      source: story.source,
      date: edition.edition_date,
    });
    storyOgCache.set(key, { at: Date.now(), buf });
    if (storyOgCache.size > 200) {
      const oldest = [...storyOgCache.entries()].sort((a, b) => a[1].at - b[1].at)[0]?.[0];
      if (oldest) storyOgCache.delete(oldest);
    }
    res.set("Content-Type", "image/png");
    res.set("Cache-Control", "public, max-age=86400");
    res.send(buf);
  } catch (err) {
    console.error("story og error:", err.message);
    res.status(500).send("og generation failed");
  }
});

// SSR'd story share page — crawler-friendly meta + redirects humans to the story
app.get("/story/:slug/:ref", async (req, res) => {
  try {
    const { slug, ref } = req.params;
    const edition = await getEditionBySlug(slug);
    const appUrl = process.env.APP_URL || "http://localhost:5173";
    const ogUrl = `${req.protocol}://${req.get("host")}/api/og/${slug}/${ref}.png`;

    const story = edition
      ? (edition.data?.sections || []).flatMap((s) => s.stories || []).find((st) => st.ref === ref)
      : null;

    if (!story) {
      // Fall back to the share landing if the story can't be found
      return res.redirect(`/share/${slug}`);
    }

    const title = `${story.title} — featured in Dispatch · Tech`;
    const description = story.tldr || story.why_it_matters || "From today's Dispatch.";

    res.set("Content-Type", "text/html; charset=utf-8");
    res.send(`<!doctype html>
<html lang="en"><head>
<meta charset="UTF-8" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
<meta property="og:type" content="article" />
<meta property="og:site_name" content="Dispatch" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:image" content="${esc(ogUrl)}" />
<meta property="og:url" content="${esc(appUrl)}/edition/${esc(slug)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(description)}" />
<meta name="twitter:image" content="${esc(ogUrl)}" />
<meta http-equiv="refresh" content="0; url=${esc(story.url)}" />
<style>body{font-family:Georgia,serif;background:#0d0c0a;color:#f4ecdc;text-align:center;padding:80px 20px}a{color:#c9a14a}</style>
</head><body>
<p>Opening the story&hellip; <a href="${esc(story.url)}">tap here if it doesn't load</a>.</p>
<p style="margin-top:24px"><a href="${esc(appUrl)}/edition/${esc(slug)}">See the full edition this story is from →</a></p>
</body></html>`);
  } catch (err) {
    console.error("story share error:", err.message);
    res.status(500).send("share failed");
  }
});

/* ─── /share/:slug — SSR'd OG meta page for social crawlers ── */
app.get("/share/:slug", async (req, res) => {
  try {
    const slug = req.params.slug;
    const edition = await getEditionBySlug(slug);
    const appUrl = process.env.APP_URL || "http://localhost:5173";
    const ogUrl = `${req.protocol}://${req.get("host")}/api/og/${slug}.png`;
    const editionUrl = `${appUrl}/edition/${slug}`;
    const title = edition?.data?.headline
      ? `Dispatch · Tech — ${edition.data.headline}`
      : "Dispatch · Tech";
    const description =
      edition?.data?.editor_note ||
      "A career-intelligence morning brief for working developers. AI-curated from HN, GitHub, arXiv and more.";

    res.set("Content-Type", "text/html; charset=utf-8");
    res.send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="Dispatch" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:image" content="${esc(ogUrl)}" />
  <meta property="og:url" content="${esc(editionUrl)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(description)}" />
  <meta name="twitter:image" content="${esc(ogUrl)}" />
  <meta http-equiv="refresh" content="0; url=${esc(editionUrl)}" />
  <style>body{font-family:Georgia,serif;background:#0d0c0a;color:#f4ecdc;text-align:center;padding:80px 20px}</style>
</head>
<body>
  <p>Opening the edition&hellip; <a href="${esc(editionUrl)}" style="color:#c9a14a">tap here if it doesn't load</a>.</p>
</body>
</html>`);
  } catch (err) {
    console.error("share error:", err);
    res.status(500).send("share failed");
  }
});

function esc(s) {
  return String(s || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

app.use("/api/auth", authRouter);
app.use("/api/me", meRouter);
app.use("/api/editions", editionsRouter);
app.use("/api/bookmarks", bookmarksRouter);
app.use("/api/feed", feedRouter);
app.use("/api/invites", invitesRouter);
app.use("/api/letters", lettersRouter);
app.use("/api/track", trackRouter);
app.use("/api/interest", interestRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/admin", adminRouter);
app.use("/api/slack", slackRouter);
app.use("/api/push", pushRouter);
app.use("/api/unsubscribe", unsubscribeRouter);
app.use("/api/cron", cronRouter);

// Wave N Day 1 — Sentry error handler MUST be the last middleware.
// Catches anything thrown by route handlers; original error still propagates to Express.
if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers?.errorHandler?.() || ((_err, _req, _res, next) => next(_err)));
}

// Safety net — keep the process alive if any route leaks an async error
process.on("unhandledRejection", (err) => {
  console.error("unhandledRejection:", err?.message || err);
  captureError(err, { source: "unhandledRejection" });
});
process.on("uncaughtException", (err) => {
  console.error("uncaughtException:", err?.message || err);
  captureError(err, { source: "uncaughtException" });
});

// Graceful flush of analytics on SIGTERM (Render sends this on redeploy)
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, flushing analytics…");
  await flushPosthog();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`dispatch server on :${PORT}`);
  // Fire-and-forget — don't block boot
  prewarmDefaultSample();
});
