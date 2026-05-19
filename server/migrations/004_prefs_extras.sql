-- Wave E personalization fields. All additive, all nullable / default-valued.

-- Negative topics + per-beat weights live on prefs (per subscription concept).
alter table prefs
  add column if not exists exclude_topics text[] not null default '{}',
  add column if not exists topic_weights jsonb not null default '{}'::jsonb;

-- Vacation mode lives on users (applies to all subscriptions a user might have).
alter table users
  add column if not exists paused_until timestamptz;

create index if not exists users_paused_until_idx on users (paused_until)
  where paused_until is not null;
