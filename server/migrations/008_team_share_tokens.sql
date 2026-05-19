-- Per-edition team share links — 7-day read access with no login.

create table if not exists team_share_tokens (
  token text primary key,
  edition_slug text not null references editions(slug) on delete cascade,
  created_by_user_id uuid not null references users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists team_share_tokens_edition_idx on team_share_tokens (edition_slug);
create index if not exists team_share_tokens_expires_idx on team_share_tokens (expires_at);
