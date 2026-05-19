import { Router } from "express";
import {
  getOrCreateInviteForUser,
  getInviteByToken,
  countInviteRedemptions,
  getInviteLeaderboard,
  getMyInviteStats,
} from "../db.js";
import { requireAuth } from "../auth.js";

const router = Router();

router.get("/leaderboard", async (_req, res) => {
  try {
    const rows = await getInviteLeaderboard(10);
    res.json({
      leaderboard: rows.map((r) => ({
        email_hint: String(r.email || "").replace(/^(.).+(@.+)$/, "$1***$2"),
        redemptions: r.redemptions,
      })),
    });
  } catch (err) {
    console.error("leaderboard error:", err.message);
    res.status(500).json({ error: "could not load leaderboard" });
  }
});

router.get("/stats", requireAuth, async (req, res) => {
  try {
    const stats = await getMyInviteStats(req.userId);
    res.json(stats);
  } catch (err) {
    console.error("invite stats error:", err.message);
    res.status(500).json({ error: "could not load stats" });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  try {
    const token = await getOrCreateInviteForUser(req.userId);
    const count = await countInviteRedemptions(req.userId);
    res.json({ token, count });
  } catch (err) {
    console.error("invite/me error:", err.message);
    res.status(500).json({ error: "could not load invite" });
  }
});

router.get("/lookup/:token", async (req, res) => {
  try {
    const inv = await getInviteByToken(req.params.token);
    if (!inv) return res.status(404).json({ error: "not found" });
    const masked = inv.owner_email.replace(/^(.).+(@.+)$/, "$1***$2");
    res.json({ token: inv.token, inviter_hint: masked });
  } catch (err) {
    console.error("invite/lookup error:", err.message);
    res.status(500).json({ error: "lookup failed" });
  }
});

export default router;
