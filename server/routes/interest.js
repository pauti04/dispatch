import { Router } from "express";
import { z } from "zod";
import { addInterest, countInterest } from "../db.js";

const router = Router();

const ALLOWED_PUBS = ["finance", "design", "ai-research", "cybersecurity-weekly"];

const subscribeSchema = z.object({
  publication_id: z.enum(ALLOWED_PUBS),
  email: z.string().email().max(200),
  source: z.string().max(100).optional(),
});

router.post("/subscribe", async (req, res) => {
  const parsed = subscribeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid input" });
  try {
    const row = await addInterest({
      publicationId: parsed.data.publication_id,
      email: parsed.data.email.toLowerCase(),
      source: parsed.data.source,
    });
    const count = await countInterest(parsed.data.publication_id);
    res.json({ ok: true, count, id: row.id });
  } catch (err) {
    console.error("interest subscribe error:", err.message);
    res.status(500).json({ error: "could not save interest" });
  }
});

router.get("/count/:publication", async (req, res) => {
  if (!ALLOWED_PUBS.includes(req.params.publication))
    return res.status(404).json({ error: "unknown publication" });
  try {
    const count = await countInterest(req.params.publication);
    res.json({ publication: req.params.publication, count });
  } catch (err) {
    console.error("interest count error:", err.message);
    res.status(500).json({ error: "could not count" });
  }
});

export default router;
