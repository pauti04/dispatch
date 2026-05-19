import { Router } from "express";
import { z } from "zod";
import {
  sql,
  findOrCreateUserByEmail,
  createLoginToken,
  consumeLoginToken,
  markUserLogin,
  getUserById,
  upsertPrefs,
  getPrefs,
  getInviteByToken,
  redeemInvite,
  updateUser,
} from "../db.js";
import {
  newLoginToken,
  signSession,
  setSessionCookie,
  clearSessionCookie,
} from "../auth.js";
import { sendMagicLink, sendWelcomeEmail } from "../email.js";
import { track, identify, events, captureError } from "../observability.js";

const router = Router();

const APP_URL = process.env.APP_URL || "http://localhost:5173";

// Per-email rate limiter for magic-link requests (separate from the per-IP middleware).
// Window: 15 minutes. Cap: 5 requests per email. Prevents a single victim's inbox from being
// magic-link-spammed by an attacker who controls many IPs.
const EMAIL_WINDOW_MS = 15 * 60 * 1000;
const EMAIL_CAP = 5;
const emailHits = new Map(); // email -> { count, resetAt }

function emailRateLimitHit(email) {
  const now = Date.now();
  const key = email.toLowerCase();
  let rec = emailHits.get(key);
  if (!rec || now > rec.resetAt) {
    rec = { count: 0, resetAt: now + EMAIL_WINDOW_MS };
    emailHits.set(key, rec);
  }
  rec.count++;
  // Periodic cleanup so the map doesn't grow unbounded
  if (emailHits.size > 5000) {
    for (const [k, v] of emailHits) {
      if (now > v.resetAt) emailHits.delete(k);
      if (emailHits.size < 4000) break;
    }
  }
  return rec.count > EMAIL_CAP;
}

const requestSchema = z.object({
  email: z.string().email(),
  role: z.string().max(64).optional(),
  skill_level: z.enum(["beginner", "intermediate", "advanced", "expert"]).optional(),
  topics: z.array(z.string()).optional(),  // domains, stored in prefs.topics for backward-compat
  domains: z.array(z.string()).optional(),
  depth: z.enum(["skim", "standard", "deep"]).optional(),
  invite_token: z.string().max(64).optional(),
  attribution: z.record(z.string().max(100)).optional(),
});

router.post("/request", async (req, res) => {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid input" });

  const { email, role, skill_level, topics, domains, depth, invite_token, attribution } = parsed.data;

  if (emailRateLimitHit(email)) {
    return res.status(429).json({ error: "too many magic-link requests for this email — try again in 15 min" });
  }

  // Is this a genuinely new signup? (Used for invite attribution.)
  const existing = await sql`select 1 from users where email = ${email.toLowerCase()} limit 1`;
  const isNewSignup = existing.length === 0;

  const user = await findOrCreateUserByEmail(email.toLowerCase());

  // Invite attribution — only on genuinely new users; self-invites ignored
  if (invite_token && isNewSignup) {
    try {
      const invite = await getInviteByToken(invite_token);
      if (invite && invite.owner_user_id !== user.id) {
        await redeemInvite({ inviteToken: invite_token, redeemedByUserId: user.id });
      }
    } catch (err) {
      console.warn("invite redemption failed (non-fatal):", err.message);
    }
  }

  // Seed user-level fields only when missing (first-time signups arrive with defaults)
  const userPatch = {};
  if (role && !user.role) userPatch.role = role;
  if (skill_level && !user.skill_level) userPatch.skill_level = skill_level;
  // First-touch attribution — only stash on genuinely new users so we don't overwrite
  // attribution on returning signups (or login from a different source).
  if (attribution && isNewSignup && !user.attribution_source) {
    userPatch.attribution_source = attribution;
  }
  if (Object.keys(userPatch).length) {
    await updateUser(user.id, userPatch);
  }

  // Seed prefs (domains stored in prefs.topics for backward-compat) on first signup only
  const effectiveDomains = (Array.isArray(domains) && domains.length ? domains : topics) || [];
  if (effectiveDomains.length && !(await getPrefs(user.id))) {
    await upsertPrefs(user.id, { topics: effectiveDomains, depth: depth || "standard" });
  }

  const { token, expiresAt } = newLoginToken();
  await createLoginToken(user.id, token, expiresAt);

  const verifyUrl = `${APP_URL}/verify?token=${encodeURIComponent(token)}`;

  try {
    await sendMagicLink({ to: email, verifyUrl });
  } catch (err) {
    console.error("magic-link send failed:", err.message);
    // In dev, surface the link in the response so devs without Resend can test
    if (process.env.NODE_ENV !== "production") {
      return res.json({ ok: true, dev_link: verifyUrl });
    }
    return res.status(500).json({ error: "could not send email" });
  }

  res.json({ ok: true });
});

router.get("/verify", async (req, res) => {
  const token = String(req.query.token || "");
  if (!token) return res.status(400).json({ error: "missing token" });

  try {
    const userId = await consumeLoginToken(token);
    if (!userId) return res.status(400).json({ error: "invalid or expired token" });

    // First-ever verify (no last_login yet)? Fire welcome email after marking login.
    const userBefore = await getUserById(userId);
    const isFirstVerify = !userBefore?.last_login_at;

    await markUserLogin(userId);
    const session = signSession(userId);
    setSessionCookie(res, session);

    const user = await getUserById(userId);

    // Wave N — fire signup/login analytics with attribution if present
    identify(user.id, {
      email: user.email,
      role: user.role,
      skill_level: user.skill_level,
      attribution_source: user.attribution_source || null,
    });
    track(user.id, events.SIGNUP_VERIFIED, {
      first_verify: isFirstVerify,
      had_attribution: !!user.attribution_source,
      utm_source: user.attribution_source?.utm_source || null,
    });

    // Welcome email — fire-and-forget on first verify. If RESEND_API_KEY missing or send
    // fails, we don't want it to block the auth flow. Capture errors for observability.
    if (isFirstVerify) {
      sendWelcomeEmail({ user })
        .then(() => track(user.id, events.WELCOME_EMAIL_SENT))
        .catch((err) => {
          console.warn("welcome email failed (non-fatal):", err.message);
          captureError(err, { source: "sendWelcomeEmail", user_id: String(user.id) });
        });
    }

    res.json({ ok: true, user: publicUser(user) });
  } catch (err) {
    captureError(err, { route: "/api/auth/verify" });
    res.status(500).json({ error: "verify failed" });
  }
});

router.post("/logout", (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

export function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    timezone: u.timezone,
    send_time: u.send_time,
    send_days: u.send_days,
    status: u.status,
    role: u.role,
    skill_level: u.skill_level,
    handle: u.handle,
    unsubscribe_token: u.unsubscribe_token, // doubles as the personal feed token
    created_at: u.created_at,
  };
}

export default router;
