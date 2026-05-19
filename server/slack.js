// Minimal Slack OAuth + posting client. We use the v2 OAuth flow.
// Env vars: SLACK_CLIENT_ID, SLACK_CLIENT_SECRET, SLACK_REDIRECT_URI

import { sql } from "./db.js";

const SLACK_AUTHORIZE_URL = "https://slack.com/oauth/v2/authorize";
const SLACK_TOKEN_URL = "https://slack.com/api/oauth.v2.access";
const SLACK_POST_URL = "https://slack.com/api/chat.postMessage";
const SCOPES = ["chat:write", "channels:read"].join(",");

export function authorizeUrl(state) {
  const params = new URLSearchParams({
    client_id: process.env.SLACK_CLIENT_ID || "",
    scope: SCOPES,
    redirect_uri: process.env.SLACK_REDIRECT_URI || "",
    state: state || "",
  });
  return `${SLACK_AUTHORIZE_URL}?${params.toString()}`;
}

export async function exchangeCodeForToken(code) {
  const body = new URLSearchParams({
    client_id: process.env.SLACK_CLIENT_ID || "",
    client_secret: process.env.SLACK_CLIENT_SECRET || "",
    code,
    redirect_uri: process.env.SLACK_REDIRECT_URI || "",
  });
  const r = await fetch(SLACK_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = await r.json();
  if (!json.ok) throw new Error(`Slack OAuth failed: ${json.error || "unknown"}`);
  return json;
}

export async function saveIntegration({ userId, oauthResponse }) {
  const o = oauthResponse;
  const team_id = o.team?.id;
  const team_name = o.team?.name;
  const channel_id = o.incoming_webhook?.channel_id || o.channel || null;
  const channel_name = o.incoming_webhook?.channel || null;
  const access_token = o.access_token;
  const bot_user_id = o.bot_user_id || null;
  if (!team_id || !channel_id || !access_token) {
    throw new Error("Slack OAuth response missing required fields");
  }
  const r = await sql`
    insert into slack_integrations
      (user_id, team_id, team_name, channel_id, channel_name, access_token, bot_user_id, scope, status)
    values
      (${userId}, ${team_id}, ${team_name || null}, ${channel_id}, ${channel_name || null}, ${access_token}, ${bot_user_id}, ${o.scope || null}, 'active')
    on conflict (user_id, team_id, channel_id) do update
      set access_token = excluded.access_token,
          channel_name = excluded.channel_name,
          team_name = excluded.team_name,
          status = 'active'
    returning id, team_name, channel_name
  `;
  return r[0];
}

export async function listIntegrationsForUser(userId) {
  return sql`
    select id, team_id, team_name, channel_id, channel_name, status, created_at
    from slack_integrations
    where user_id = ${userId}
    order by created_at desc
  `;
}

export async function disconnectIntegration(userId, integrationId) {
  await sql`
    update slack_integrations set status = 'revoked'
    where id = ${integrationId} and user_id = ${userId}
  `;
}

/**
 * Post a single brief to all of a user's active Slack integrations.
 * Cron call site will iterate users → call this per user.
 */
export async function postBriefToUserSlacks({ userId, brief, editionUrl }) {
  const rows = await sql`
    select access_token, channel_id, channel_name
    from slack_integrations
    where user_id = ${userId} and status = 'active'
  `;
  if (!rows.length) return { posted: 0 };

  const blocks = briefToSlackBlocks({ brief, editionUrl });
  let posted = 0;
  for (const row of rows) {
    try {
      const r = await fetch(SLACK_POST_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${row.access_token}`,
        },
        body: JSON.stringify({
          channel: row.channel_id,
          text: brief.headline || "Dispatch · today's edition",
          blocks,
        }),
      });
      const j = await r.json();
      if (j.ok) posted++;
      else console.warn("slack post failed:", j.error);
    } catch (err) {
      console.warn("slack post threw:", err.message);
    }
  }
  return { posted };
}

function briefToSlackBlocks({ brief, editionUrl }) {
  const blocks = [
    {
      type: "header",
      text: { type: "plain_text", text: "Dispatch · Tech — today's brief", emoji: false },
    },
  ];
  if (brief.headline) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `*${brief.headline}*` },
    });
  }
  if (brief.editor_note) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `_${brief.editor_note}_\n— The Editor` },
    });
  }
  if (brief.take) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `*The Editor's Take*\n${brief.take}` },
    });
  }
  const pickRef = brief.editor_pick;
  const allStories = (brief.sections || []).flatMap((s) => s.stories || []);
  const pick = pickRef ? allStories.find((st) => st.ref === pickRef) : null;
  if (pick) {
    blocks.push({ type: "divider" });
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*★ Editor's Pick*\n<${pick.url}|${pick.title}>\n${pick.tldr || ""}`,
      },
    });
  }
  for (const sec of brief.sections || []) {
    const others = (sec.stories || []).filter((s) => s.ref !== pickRef).slice(0, 3);
    if (!others.length) continue;
    blocks.push({ type: "divider" });
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `*${sec.topic}*` },
    });
    for (const st of others) {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `• <${st.url}|${st.title}>${st.tldr ? `\n  ${st.tldr}` : ""}`,
        },
      });
    }
  }
  if (editionUrl) {
    blocks.push({ type: "divider" });
    blocks.push({
      type: "context",
      elements: [{ type: "mrkdwn", text: `<${editionUrl}|View full edition →>` }],
    });
  }
  return blocks;
}
