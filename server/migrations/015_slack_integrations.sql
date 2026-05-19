-- Slack OAuth tokens — one row per (user, workspace, channel).
-- access_token is sensitive; treat the row as PII. Encryption-at-rest is a Phase 2 concern
-- (Neon's storage is encrypted; column-level encryption is overkill for now).

create table if not exists slack_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  team_id text not null,         -- Slack workspace id (T...)
  team_name text,
  channel_id text not null,      -- C...
  channel_name text,
  access_token text not null,    -- xoxb-... (bot token)
  bot_user_id text,
  scope text,
  status text not null default 'active',  -- active | revoked
  created_at timestamptz not null default now(),
  unique (user_id, team_id, channel_id)
);

create index if not exists slack_integrations_user_idx on slack_integrations (user_id, status);
