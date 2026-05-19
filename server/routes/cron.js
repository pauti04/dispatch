import { Router } from "express";
import { runDispatchHour, runWeeklyReview } from "../cron.js";

const router = Router();

function checkSecret(req, res) {
  const secret = process.env.CRON_SECRET;
  const provided = req.get("x-cron-secret");
  if (!secret || secret === "change-me-to-a-long-random-string") {
    res.status(500).json({ error: "CRON_SECRET not configured" });
    return false;
  }
  if (provided !== secret) {
    res.status(401).json({ error: "unauthorized" });
    return false;
  }
  return true;
}

router.post("/dispatch", async (req, res) => {
  if (!checkSecret(req, res)) return;
  try {
    const result = await runDispatchHour();
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error("cron route error:", err);
    res.status(500).json({ error: String(err.message || err) });
  }
});

router.post("/weekly-review", async (req, res) => {
  if (!checkSecret(req, res)) return;
  try {
    const result = await runWeeklyReview();
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error("weekly cron route error:", err);
    res.status(500).json({ error: String(err.message || err) });
  }
});

export default router;
