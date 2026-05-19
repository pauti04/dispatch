-- Letters to the editor — readers respond to an edition with a short paragraph.
-- The next day's brief surfaces 1-2 of them in a "Letters" section.

create table if not exists letters (
  id uuid primary key default gen_random_uuid(),
  edition_slug text not null references editions(slug) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists letters_recent_idx on letters (created_at desc);
create index if not exists letters_edition_idx on letters (edition_slug);
