-- Wave N Day 1: capture first-touch attribution on signup.
-- Stored as JSONB so we can hold any UTM keys without future schema changes.

alter table users
  add column if not exists attribution_source jsonb;

-- Lightweight index so we can group by source in admin queries
create index if not exists users_attribution_source_idx
  on users using gin (attribution_source);
