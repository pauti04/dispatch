-- Expo push tokens for the mobile app.
create table if not exists push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  token text not null,        -- ExponentPushToken[xxx]
  platform text,              -- "ios" | "android"
  app_version text,
  status text not null default 'active',  -- active | revoked
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  unique (user_id, token)
);

create index if not exists push_tokens_user_active on push_tokens (user_id) where status = 'active';
