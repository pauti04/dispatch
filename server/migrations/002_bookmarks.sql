-- Saved stories ("bookmarks"). One row per user × URL.
create table if not exists bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  story_url text not null,
  title text not null,
  source text,
  edition_slug text,    -- which edition the user found it in (nullable)
  saved_at timestamptz not null default now()
);

-- One bookmark per user × URL
create unique index if not exists bookmarks_user_url_idx on bookmarks (user_id, story_url);
create index if not exists bookmarks_user_saved_idx on bookmarks (user_id, saved_at desc);
