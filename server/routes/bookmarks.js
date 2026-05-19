import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../auth.js";
import { listBookmarks, addBookmark, removeBookmark, setBookmarkPublic } from "../db.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  try {
    const rows = await listBookmarks(req.userId, 200);
    res.json({ bookmarks: rows });
  } catch (err) {
    console.error("bookmarks list error:", err.message);
    res.status(500).json({ error: "could not load bookmarks" });
  }
});

const addSchema = z.object({
  story_url: z.string().url().max(1000),
  title: z.string().max(500),
  source: z.string().max(64).optional(),
  edition_slug: z.string().max(64).optional(),
});

router.post("/", async (req, res) => {
  const parsed = addSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid input" });
  try {
    const row = await addBookmark(req.userId, parsed.data);
    res.json({ bookmark: row });
  } catch (err) {
    console.error("bookmarks add error:", err.message);
    res.status(500).json({ error: "could not save bookmark" });
  }
});

router.delete("/", async (req, res) => {
  const story_url = String(req.query.story_url || "");
  if (!story_url) return res.status(400).json({ error: "story_url required" });
  try {
    await removeBookmark(req.userId, story_url);
    res.json({ ok: true });
  } catch (err) {
    console.error("bookmarks remove error:", err.message);
    res.status(500).json({ error: "could not remove bookmark" });
  }
});

const visibilitySchema = z.object({
  story_url: z.string().url().max(1000),
  is_public: z.boolean(),
});

router.patch("/visibility", async (req, res) => {
  const parsed = visibilitySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid input" });
  try {
    await setBookmarkPublic(req.userId, parsed.data.story_url, parsed.data.is_public);
    res.json({ ok: true });
  } catch (err) {
    console.error("bookmarks visibility error:", err.message);
    res.status(500).json({ error: "could not update visibility" });
  }
});

export default router;
