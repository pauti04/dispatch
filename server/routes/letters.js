import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../auth.js";
import { postLetter, listLettersForEdition, getEditionBySlug } from "../db.js";

const router = Router();

const postSchema = z.object({
  body: z.string().min(20).max(800),
});

// Post a letter to an edition. Auth required, must be the owner of the edition.
router.post("/:slug", requireAuth, async (req, res) => {
  const parsed = postSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "letter must be 20-800 characters" });
  try {
    const edition = await getEditionBySlug(req.params.slug);
    if (!edition) return res.status(404).json({ error: "edition not found" });
    if (edition.user_id !== req.userId)
      return res.status(403).json({ error: "you can only write letters about your own editions" });
    const letter = await postLetter({
      userId: req.userId,
      editionSlug: req.params.slug,
      body: parsed.data.body.trim(),
    });
    res.json({ letter });
  } catch (err) {
    console.error("letter post error:", err.message);
    res.status(500).json({ error: "could not save letter" });
  }
});

// List letters for an edition (auth required — same edition-access rules as the read view).
router.get("/:slug", requireAuth, async (req, res) => {
  try {
    const letters = await listLettersForEdition(req.params.slug, 10);
    res.json({ letters });
  } catch (err) {
    console.error("letter list error:", err.message);
    res.status(500).json({ error: "could not load letters" });
  }
});

export default router;
