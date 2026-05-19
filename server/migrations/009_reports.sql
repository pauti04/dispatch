-- Dispatch Reports — occasional long-form pieces synthesized from a week's editions.
-- Public by design; meant to be SEO + share surface.

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  subtitle text,
  body text not null,
  pull_quote text,
  topic text,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists reports_published_idx on reports (published_at desc);
