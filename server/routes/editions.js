import { Router } from "express";
import { z } from "zod";
import {
  getEditionBySlug,
  listEditionsForUser,
  createTeamShareToken,
  getTeamShareToken,
  getUserById,
  getOrCreateInviteForUser,
} from "../db.js";
import { readSessionCookie, verifyEditionViewToken, requireAuth } from "../auth.js";
import { sendForwardedEdition } from "../email.js";

const router = Router();

// List user's editions (archive). Auth required.
router.get("/", requireAuth, async (req, res) => {
  try {
    const before = req.query.before ? String(req.query.before) : null;
    const limit = Math.min(parseInt(req.query.limit, 10) || 30, 100);
    const rows = await listEditionsForUser(req.userId, { limit, before });
    res.json({
      editions: rows.map((e) => ({
        slug: e.slug,
        edition_date: e.edition_date,
        status: e.status,
        sent_at: e.sent_at,
        headline: e.data?.headline || null,
        editor_note: e.data?.editor_note || null,
        pull_quote: e.data?.pull_quote || null,
        section_count: (e.data?.sections || []).length,
        story_count: (e.data?.sections || []).reduce((n, s) => n + (s.stories?.length || 0), 0),
      })),
    });
  } catch (err) {
    console.error("editions list error:", err.message);
    res.status(500).json({ error: "could not load editions" });
  }
});

router.get("/:slug", async (req, res) => {
  try {
    const slug = req.params.slug;
    const edition = await getEditionBySlug(slug);
    if (!edition) return res.status(404).json({ error: "not found" });

    const sessionUserId = readSessionCookie(req);
    if (sessionUserId === edition.user_id) {
      return res.json({ edition: publicEdition(edition) });
    }

    // Email "view in browser" token (long-lived, per-user)
    const viewToken = req.query.t;
    if (viewToken) {
      const payload = verifyEditionViewToken(String(viewToken));
      if (payload && payload.slug === slug && payload.sub === edition.user_id) {
        return res.json({ edition: publicEdition(edition) });
      }
    }

    // Team share token (7-day, per-edition, anyone with the link)
    const teamToken = req.query.team;
    if (teamToken) {
      const row = await getTeamShareToken(String(teamToken));
      if (row && row.edition_slug === slug) {
        return res.json({ edition: publicEdition(edition), via: "team_share" });
      }
    }

    return res.status(403).json({ error: "forbidden" });
  } catch (err) {
    console.error("edition fetch error:", err.message);
    res.status(500).json({ error: "could not load edition" });
  }
});

const forwardSchema = z.object({
  to_email: z.string().email().max(200),
});

// Forward an edition to a friend's email. Auth required + must own the edition.
router.post("/:slug/forward", requireAuth, async (req, res) => {
  const parsed = forwardSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "valid email required" });
  try {
    const edition = await getEditionBySlug(req.params.slug);
    if (!edition) return res.status(404).json({ error: "edition not found" });
    if (edition.user_id !== req.userId)
      return res.status(403).json({ error: "you can only forward your own editions" });
    const user = await getUserById(req.userId);
    const inviteToken = await getOrCreateInviteForUser(req.userId).catch(() => null);
    const fromName = user?.name || (user?.email ? user.email.split("@")[0] : "a Dispatch reader");
    await sendForwardedEdition({
      toEmail: parsed.data.to_email,
      fromName,
      brief: edition.data,
      inviteToken,
    });
    res.json({ ok: true });
  } catch (err) {
    console.error("forward error:", err.message);
    res.status(500).json({ error: "could not forward edition" });
  }
});

// Auth'd users generate a 7-day team-share token for their own edition.
router.post("/:slug/team-share", requireAuth, async (req, res) => {
  try {
    const slug = req.params.slug;
    const edition = await getEditionBySlug(slug);
    if (!edition) return res.status(404).json({ error: "not found" });
    if (edition.user_id !== req.userId)
      return res.status(403).json({ error: "you can only share your own editions" });
    const row = await createTeamShareToken({
      editionSlug: slug,
      createdByUserId: req.userId,
    });
    res.json({ token: row.token, expires_at: row.expires_at });
  } catch (err) {
    console.error("team share create error:", err.message);
    res.status(500).json({ error: "could not create share token" });
  }
});

function publicEdition(e) {
  return {
    slug: e.slug,
    edition_date: e.edition_date,
    sent_at: e.sent_at,
    status: e.status,
    data: e.data,
  };
}

export default router;
