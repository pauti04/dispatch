-- Click tracking — every time a user follows a story link from a brief.
-- Used to derive a "reader signal" the prompt can use to refine future relevance.

create table if not exists clicks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  edition_slug text references editions(slug) on delete set null,
  story_url text not null,
  story_source text,
  story_title text,
  clicked_at timestamptz not null default now()
);

-- Idempotency at the day level: one row per (user, story) per day, so reloads don't inflate counts.
create unique index if not exists clicks_unique_day
  on clicks (user_id, story_url, (clicked_at::date));

create index if not exists clicks_user_recent on clicks (user_id, clicked_at desc);
