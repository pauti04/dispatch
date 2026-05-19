import { Router } from "express";
import { requireAuth } from "../auth.js";
import { getUserById, sql } from "../db.js";
import { topSpenders, dailyTotals, breakdownByEndpoint, getTodayCostUsd } from "../usage.js";
import { variantResults } from "../variants.js";

const router = Router();

// Admin emails — comma-separated env var like ADMIN_EMAILS="me@x.com,you@y.com".
const ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
);

async function requireAdmin(req, res, next) {
  try {
    if (ADMIN_EMAILS.size === 0)
      return res.status(503).json({ error: "ADMIN_EMAILS not configured" });
    const user = await getUserById(req.userId);
    if (!user || !ADMIN_EMAILS.has(String(user.email).toLowerCase()))
      return res.status(403).json({ error: "admin only" });
    next();
  } catch (err) {
    res.status(500).json({ error: "admin check failed" });
  }
}

router.use(requireAuth, requireAdmin);

router.get("/ab-results", async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days, 10) || 14, 90);
    const results = await variantResults({ days });
    res.json({ days, variants: results });
  } catch (err) {
    console.error("admin/ab-results error:", err.message);
    res.status(500).json({ error: "could not load AB results" });
  }
});

router.get("/cost", async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days, 10) || 7, 90);
    const [spenders, daily, byEndpoint, todayUsd] = await Promise.all([
      topSpenders({ days, limit: 25 }),
      dailyTotals({ days }),
      breakdownByEndpoint({ days }),
      getTodayCostUsd(),
    ]);
    res.json({ days, today_usd: todayUsd, top_spenders: spenders, daily, by_endpoint: byEndpoint });
  } catch (err) {
    console.error("admin/cost error:", err.message);
    res.status(500).json({ error: "could not load cost data" });
  }
});

// Recent brief quality scores (LLM-as-judge output from Wave J)
router.get("/scores", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const rows = await sql`
      select edition_slug, request_id, variant_id, coherence, career_relevance,
             voice_fidelity, overall, notes, created_at
      from brief_scores
      order by created_at desc
      limit ${limit}
    `;
    res.json({ scores: rows });
  } catch (err) {
    console.error("admin/scores error:", err.message);
    res.status(500).json({ error: "could not load scores" });
  }
});

// Wave N+ — admin can post a "founder note" that renders atop today's edition
// for all users (or just for self). Stored in `founder_notes` (migration 019).
router.get("/founder-note", async (_req, res) => {
  try {
    const rows = await sql`
      select id, body, audience, created_at, expires_at
      from founder_notes
      where expires_at is null or expires_at > now()
      order by created_at desc
      limit 5
    `;
    res.json({ notes: rows });
  } catch (err) {
    res.status(500).json({ error: "could not load founder notes" });
  }
});

router.post("/founder-note", async (req, res) => {
  try {
    const body = String(req.body?.body || "").trim().slice(0, 400);
    if (!body) return res.status(400).json({ error: "body required" });
    const audience = req.body?.audience === "self" ? "self" : "all";
    const expiresAt = req.body?.expires_at || null;
    const r = await sql`
      insert into founder_notes (body, audience, created_by, expires_at)
      values (${body}, ${audience}, ${req.userId}, ${expiresAt})
      returning id, body, audience, created_at, expires_at
    `;
    res.json({ note: r[0] });
  } catch (err) {
    console.error("admin/founder-note POST error:", err.message);
    res.status(500).json({ error: "could not save founder note" });
  }
});

router.delete("/founder-note/:id", async (req, res) => {
  try {
    await sql`delete from founder_notes where id = ${req.params.id}`;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "could not delete" });
  }
});

export default router;
