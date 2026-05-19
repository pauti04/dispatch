import { Router } from "express";
import { requireAuth } from "../auth.js";
import {
  authorizeUrl,
  exchangeCodeForToken,
  saveIntegration,
  listIntegrationsForUser,
  disconnectIntegration,
  postBriefToUserSlacks,
} from "../slack.js";
import { getEditionBySlug } from "../db.js";
import crypto from "node:crypto";

const router = Router();
const APP_URL = process.env.APP_URL || "http://localhost:5173";

// Short-lived state tokens for OAuth — JWT-signed via the auth secret would be tidier,
// but a simple in-memory map is fine while we're single-process. Keys auto-expire after 10 min.
const stateStore = new Map();
function newState(userId) {
  const s = crypto.randomBytes(16).toString("hex");
  stateStore.set(s, { userId, at: Date.now() });
  return s;
}
function consumeState(s) {
  const v = stateStore.get(s);
  if (!v) return null;
  stateStore.delete(s);
  if (Date.now() - v.at > 10 * 60 * 1000) return null;
  return v.userId;
}

// Auth required: kick off OAuth
router.get("/connect", requireAuth, (req, res) => {
  if (!process.env.SLACK_CLIENT_ID) {
    return res.status(503).json({ error: "Slack OAuth not configured (SLACK_CLIENT_ID missing)" });
  }
  const state = newState(req.userId);
  res.redirect(authorizeUrl(state));
});

// OAuth callback — Slack redirects here with ?code=…&state=…
router.get("/callback", async (req, res) => {
  try {
    const userId = consumeState(String(req.query.state || ""));
    if (!userId) return res.status(400).send("invalid or expired state");
    const code = String(req.query.code || "");
    if (!code) return res.status(400).send("missing code");
    const tokenResp = await exchangeCodeForToken(code);
    await saveIntegration({ userId, oauthResponse: tokenResp });
    res.redirect(`${APP_URL}/account?slack=connected`);
  } catch (err) {
    console.error("slack callback error:", err.message);
    res.status(500).send("Slack connect failed: " + (err.message || "unknown"));
  }
});

router.get("/integrations", requireAuth, async (req, res) => {
  try {
    const rows = await listIntegrationsForUser(req.userId);
    res.json({ integrations: rows });
  } catch (err) {
    console.error("slack integrations error:", err.message);
    res.status(500).json({ error: "could not load integrations" });
  }
});

router.delete("/integrations/:id", requireAuth, async (req, res) => {
  try {
    await disconnectIntegration(req.userId, req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error("slack disconnect error:", err.message);
    res.status(500).json({ error: "could not disconnect" });
  }
});

// Test post — sends the user's most recent edition to their connected channel(s)
router.post("/test/:slug", requireAuth, async (req, res) => {
  try {
    const edition = await getEditionBySlug(req.params.slug);
    if (!edition) return res.status(404).json({ error: "edition not found" });
    if (edition.user_id !== req.userId) return res.status(403).json({ error: "forbidden" });
    const result = await postBriefToUserSlacks({
      userId: req.userId,
      brief: edition.data,
      editionUrl: `${APP_URL}/edition/${edition.slug}`,
    });
    res.json(result);
  } catch (err) {
    console.error("slack test post error:", err.message);
    res.status(500).json({ error: "test post failed" });
  }
});

export default router;
