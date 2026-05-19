import jwt from "jsonwebtoken";
import crypto from "node:crypto";

const SESSION_COOKIE = "dispatch_session";
const SESSION_TTL_DAYS = 30;
const LOGIN_TOKEN_TTL_MIN = 15;

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s || s === "change-me-to-a-long-random-string") {
    throw new Error("JWT_SECRET is not set or is the default placeholder");
  }
  return s;
}

export function signSession(userId) {
  return jwt.sign({ sub: userId }, secret(), { expiresIn: `${SESSION_TTL_DAYS}d` });
}

export function verifySession(token) {
  try {
    return jwt.verify(token, secret());
  } catch {
    return null;
  }
}

export function setSessionCookie(res, token) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

export function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE, { path: "/" });
}

export function readSessionCookie(req) {
  const tok = req.cookies?.[SESSION_COOKIE];
  if (!tok) return null;
  const payload = verifySession(tok);
  return payload?.sub || null;
}

export function requireAuth(req, res, next) {
  const userId = readSessionCookie(req);
  if (!userId) return res.status(401).json({ error: "unauthorized" });
  req.userId = userId;
  next();
}

/* Magic-link tokens — random opaque strings, not JWTs */

export function newLoginToken() {
  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + LOGIN_TOKEN_TTL_MIN * 60 * 1000);
  return { token, expiresAt };
}

/* Edition view tokens — short JWTs for "view in browser" links */

export function signEditionViewToken(slug, userId) {
  return jwt.sign({ slug, sub: userId, kind: "edition_view" }, secret(), { expiresIn: "365d" });
}

export function verifyEditionViewToken(token) {
  try {
    const payload = jwt.verify(token, secret());
    if (payload.kind !== "edition_view") return null;
    return payload;
  } catch {
    return null;
  }
}
