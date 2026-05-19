// Expo push notifications client.
// Uses the Expo Push API: https://exp.host/--/api/v2/push/send
// Authentication is optional in dev (Expo allows anonymous push); add EXPO_ACCESS_TOKEN
// in production for higher rate limits + better delivery reporting.

import { sql } from "./db.js";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export async function listPushTokensForUser(userId) {
  return sql`
    select token, platform
    from push_tokens
    where user_id = ${userId} and status = 'active'
  `;
}

export async function registerPushToken({ userId, token, platform, appVersion }) {
  if (!token || !/^ExponentPushToken\[/.test(token)) {
    throw new Error("invalid Expo push token");
  }
  const r = await sql`
    insert into push_tokens (user_id, token, platform, app_version, last_used_at)
    values (${userId}, ${token}, ${platform || null}, ${appVersion || null}, now())
    on conflict (user_id, token) do update set
      platform = excluded.platform,
      app_version = excluded.app_version,
      status = 'active',
      last_used_at = now()
    returning id
  `;
  return r[0];
}

export async function revokePushToken({ userId, token }) {
  await sql`
    update push_tokens set status = 'revoked'
    where user_id = ${userId} and token = ${token}
  `;
}

/**
 * Send a "your brief is ready" push to every active token a user has.
 * Returns { sent } count; failures are logged but don't throw.
 */
export async function pushBriefReady({ userId, brief, editionSlug }) {
  const tokens = await listPushTokensForUser(userId);
  if (!tokens.length) return { sent: 0 };

  const headline = (brief?.headline || "Today's edition").slice(0, 100);
  const messages = tokens.map((t) => ({
    to: t.token,
    sound: "default",
    title: "Dispatch · Tech",
    body: headline,
    data: { editionSlug },
    channelId: "default",
  }));

  try {
    const r = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        ...(process.env.EXPO_ACCESS_TOKEN
          ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` }
          : {}),
      },
      body: JSON.stringify(messages),
    });
    const json = await r.json();
    if (!r.ok || json.errors?.length) {
      console.warn("expo push partial failure:", json.errors || json);
    }
    return { sent: tokens.length };
  } catch (err) {
    console.warn("expo push threw:", err.message);
    return { sent: 0 };
  }
}
