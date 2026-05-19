import { Router } from "express";
import { z } from "zod";
import { synthesizeReport } from "../reports.js";
import {
  insertReport,
  getReportBySlug,
  listRecentReports,
  listRecentEditionsForUser,
} from "../db.js";
import { renderReportPage } from "../report-render.js";
import { requireAuth } from "../auth.js";

const router = Router();

// Public — list of recent reports (used by /reports index)
router.get("/", async (_req, res) => {
  try {
    const rows = await listRecentReports(20);
    res.json({ reports: rows });
  } catch (err) {
    console.error("reports list error:", err.message);
    res.status(500).json({ error: "could not list reports" });
  }
});

const generateSchema = z.object({
  topic: z.string().max(120).optional(),
});

/**
 * Admin-ish endpoint to synthesize a Report from the AUTHED USER's past 7-14 editions.
 * For Phase 1 we let any authed user generate one against their own corpus — useful for
 * power users / writers. A truer "admin only" gate can layer on later via a users.role check.
 */
router.post("/generate", requireAuth, async (req, res) => {
  const parsed = generateSchema.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: "invalid input" });
  try {
    const editions = await listRecentEditionsForUser(req.userId, 14).catch(() => []);
    if (!editions.length) {
      return res.status(400).json({ error: "you need at least one past edition to generate a report" });
    }
    const draft = await synthesizeReport({ editions, topic: parsed.data.topic });
    const row = await insertReport(draft);
    res.json({ slug: row.slug, published_at: row.published_at });
  } catch (err) {
    console.error("report generate error:", err.message);
    res.status(500).json({ error: String(err.message || "report generate failed") });
  }
});

export default router;
