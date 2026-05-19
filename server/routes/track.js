import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../auth.js";
import { recordClick } from "../db.js";

const router = Router();

const clickSchema = z.object({
  edition_slug: z.string().max(64).optional(),
  story_url: z.string().url().max(1000),
  story_source: z.string().max(32).optional(),
  story_title: z.string().max(500).optional(),
});

// Beacon endpoint — silently records a click, returns 204 even on validation failure so the
// browser's `keepalive` request doesn't surface an error to users following the link.
router.post("/click", requireAuth, async (req, res) => {
  res.status(204).end(); // respond first so the link follows without UI delay
  try {
    const parsed = clickSchema.safeParse(req.body);
    if (!parsed.success) return;
    await recordClick({
      userId: req.userId,
      editionSlug: parsed.data.edition_slug,
      storyUrl: parsed.data.story_url,
      storySource: parsed.data.story_source,
      storyTitle: parsed.data.story_title,
    });
  } catch (err) {
    console.warn("click track failed (non-fatal):", err.message);
  }
});

export default router;
