import { Router } from "express";
import { getUserByFeedToken, listEditionsForUser } from "../db.js";
import { getBeat, listBeats } from "../beats.js";
import { generateBrief } from "../brief.js";

const router = Router();
const APP_URL = process.env.APP_URL || "http://localhost:5173";

// In-memory cache for per-beat public feeds. Daily refresh — beat feed contains
// one item per day's curated brief for that beat.
const BEAT_FEED_TTL_MS = 6 * 60 * 60 * 1000;
const beatFeedCache = new Map(); // beatId -> { at, xml }

function esc(s) {
  return String(s || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

router.get("/:token.xml", async (req, res) => {
  try {
    const token = req.params.token;
    const user = await getUserByFeedToken(token);
    if (!user) return res.status(404).type("text").send("not found");

    const editions = await listEditionsForUser(user.id, { limit: 30 });
    const items = editions
      .map((e) => {
        const link = `${APP_URL}/edition/${e.slug}`;
        const pubDate = new Date(e.sent_at || e.created_at || Date.now()).toUTCString();
        const headline = e.data?.headline || "Today's edition";
        const note = e.data?.editor_note || "";
        const storyList = (e.data?.sections || [])
          .flatMap((s) => s.stories || [])
          .slice(0, 8)
          .map((st) => `  &lt;li&gt;${esc(st.title)} &amp;mdash; ${esc(st.url)}&lt;/li&gt;`)
          .join("\n");
        const description = `&lt;p&gt;${esc(note)}&lt;/p&gt;&lt;ul&gt;${storyList}&lt;/ul&gt;`;
        return `<item>
      <title>${esc(headline)}</title>
      <link>${esc(link)}</link>
      <guid isPermaLink="true">${esc(link)}</guid>
      <pubDate>${esc(pubDate)}</pubDate>
      <description>${description}</description>
    </item>`;
      })
      .join("\n    ");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Dispatch · Tech — your private feed</title>
    <link>${esc(APP_URL)}</link>
    <description>Your personal Dispatch career-intelligence brief, delivered as RSS.</description>
    <language>en</language>
    <ttl>720</ttl>
    ${items}
  </channel>
</rss>`;

    res.set("Content-Type", "application/rss+xml; charset=utf-8");
    res.set("Cache-Control", "private, max-age=900");
    res.send(xml);
  } catch (err) {
    console.error("feed error:", err);
    res.status(500).type("text").send("feed failed");
  }
});

/* ─── Wave N+ — Public per-beat RSS feeds ────────────────── */

// /api/feed/beats — index of beat feeds (for feed-reader discovery)
router.get("/beats", (_req, res) => {
  const beats = listBeats();
  const items = beats
    .map(
      (b) =>
        `<item>
      <title>Dispatch · ${esc(b.name)}</title>
      <link>${esc(APP_URL)}/api/feed/beats/${esc(b.id)}.xml</link>
      <description>${esc(b.tagline || "")}</description>
    </item>`
    )
    .join("\n    ");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Dispatch — beat feeds</title>
    <link>${esc(APP_URL)}/beats</link>
    <description>Index of per-beat RSS feeds for Dispatch · Tech.</description>
    <language>en</language>
    ${items}
  </channel>
</rss>`;
  res.set("Content-Type", "application/rss+xml; charset=utf-8");
  res.send(xml);
});

// /api/feed/beats/<beatId>.xml — public RSS feed for a beat. One item per day.
router.get("/beats/:slug.xml", async (req, res) => {
  try {
    const beat = getBeat(req.params.slug);
    if (!beat) return res.status(404).type("text").send("beat not found");

    const cached = beatFeedCache.get(beat.id);
    if (cached && Date.now() - cached.at < BEAT_FEED_TTL_MS) {
      res.set("Content-Type", "application/rss+xml; charset=utf-8");
      res.set("Cache-Control", "public, max-age=900");
      return res.send(cached.xml);
    }

    // Generate today's brief for this beat (uses the same path as the SPA beat page)
    const brief = await generateBrief({
      role: beat.role,
      skillLevel: beat.skill_level,
      domains: beat.domains,
      depth: "standard",
    });

    const pubDate = new Date().toUTCString();
    const headline = brief.headline || `Dispatch · ${beat.name}`;
    const items = (brief.sections || [])
      .flatMap((s) => s.stories || [])
      .slice(0, 8)
      .map((st) => {
        const link = st.url;
        return `<item>
      <title>${esc(st.title)}</title>
      <link>${esc(link)}</link>
      <guid isPermaLink="true">${esc(link)}</guid>
      <pubDate>${esc(pubDate)}</pubDate>
      <description>${esc(st.tldr || "")} &amp;mdash; &lt;em&gt;${esc(st.why_it_matters || "")}&lt;/em&gt;</description>
      <category>${esc(beat.name)}</category>
    </item>`;
      })
      .join("\n    ");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Dispatch · ${esc(beat.name)}</title>
    <link>${esc(APP_URL)}/beats/${esc(beat.id)}</link>
    <description>${esc(headline)}</description>
    <language>en</language>
    <ttl>360</ttl>
    <lastBuildDate>${esc(pubDate)}</lastBuildDate>
    ${items}
  </channel>
</rss>`;

    beatFeedCache.set(beat.id, { at: Date.now(), xml });
    res.set("Content-Type", "application/rss+xml; charset=utf-8");
    res.set("Cache-Control", "public, max-age=900");
    res.send(xml);
  } catch (err) {
    console.error("beat feed error:", err.message);
    res.status(500).type("text").send("beat feed failed");
  }
});

export default router;
