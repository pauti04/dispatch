import { Router } from "express";
import crypto from "node:crypto";
import { z } from "zod";
import {
  getUserById,
  getPrefs,
  upsertPrefs,
  updateUser,
  deleteUser,
} from "../db.js";
import { requireAuth, clearSessionCookie, signEditionViewToken } from "../auth.js";
import { publicUser } from "./auth.js";
import { generateBrief } from "../brief.js";
import { sendBriefEmail } from "../email.js";
import { getTrendingSkillsForUser } from "../skills.js";
import { getStreakForUser, searchUserEditions } from "../db.js";

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res) => {
  const user = await getUserById(req.userId);
  if (!user) return res.status(404).json({ error: "not found" });
  const prefs = await getPrefs(req.userId);
  res.json({ user: publicUser(user), prefs });
});

const patchSchema = z.object({
  name: z.string().max(120).optional(),
  timezone: z.string().max(80).optional(),
  send_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
  send_days: z.array(z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"])).optional(),
  status: z.enum(["active", "paused"]).optional(),
  role: z.string().max(64).optional(),
  skill_level: z.enum(["beginner", "intermediate", "advanced", "expert"]).optional(),
  paused_until: z.string().nullable().optional(),
  handle: z.string().min(2).max(32).regex(/^[a-z0-9_-]+$/i).nullable().optional(),
  topics: z.array(z.string()).min(1).optional(),
  depth: z.enum(["skim", "standard", "deep"]).optional(),
  exclude_topics: z.array(z.string().max(64)).max(20).optional(),
  topic_weights: z.record(z.string(), z.number().min(1).max(5)).optional(),
});

router.patch("/", async (req, res) => {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid input", details: parsed.error.flatten() });

  const { topics, depth, exclude_topics, topic_weights, ...userPatch } = parsed.data;

  if (Object.keys(userPatch).length) {
    await updateUser(req.userId, userPatch);
  }
  if (topics !== undefined || depth !== undefined || exclude_topics !== undefined || topic_weights !== undefined) {
    await upsertPrefs(req.userId, { topics, depth, exclude_topics, topic_weights });
  }

  const user = await getUserById(req.userId);
  const prefs = await getPrefs(req.userId);
  res.json({ user: publicUser(user), prefs });
});

router.delete("/", async (req, res) => {
  await deleteUser(req.userId);
  clearSessionCookie(res);
  res.json({ ok: true });
});

router.get("/search", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    if (!q) return res.json({ q: "", hits: [] });
    const hits = await searchUserEditions(req.userId, q, 50);
    res.json({ q, hits });
  } catch (err) {
    console.error("search error:", err.message);
    res.status(500).json({ error: "search failed" });
  }
});

router.get("/streak", async (req, res) => {
  try {
    const data = await getStreakForUser(req.userId);
    res.json(data);
  } catch (err) {
    console.error("streak error:", err.message);
    res.status(500).json({ error: "could not load streak" });
  }
});

router.get("/skills-trending", async (req, res) => {
  try {
    const data = await getTrendingSkillsForUser(req.userId);
    res.json(data);
  } catch (err) {
    console.error("skills-trending error:", err.message);
    res.status(500).json({ error: "could not load trending skills" });
  }
});

router.post("/test-send", async (req, res) => {
  try {
    const user = await getUserById(req.userId);
    const prefs = await getPrefs(req.userId);
    if (!user) return res.status(404).json({ error: "user not found" });
    if (!prefs || !prefs.topics?.length)
      return res.status(400).json({ error: "set your topics first" });

    const brief = await generateBrief({ topics: prefs.topics, depth: prefs.depth });
    // Test sends are ephemeral — don't persist so they don't claim today's daily slot
    const slug = crypto.randomBytes(6).toString("base64url");
    const viewToken = signEditionViewToken(slug, req.userId);
    await sendBriefEmail({ user, brief, slug, viewToken });
    res.json({ ok: true });
  } catch (err) {
    console.error("test-send error:", err);
    res.status(500).json({ error: String(err.message || err) });
  }
});

export default router;
