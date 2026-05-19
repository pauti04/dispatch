-- Interest list — emails captured on cross-publication teaser pages.
-- Used to gauge demand and notify when a publication ships.

create table if not exists interest_list (
  id uuid primary key default gen_random_uuid(),
  publication_id text not null,
  email citext not null,
  source text,  -- where they signed up (e.g. "/finance")
  created_at timestamptz not null default now()
);

-- One email per (publication, email)
create unique index if not exists interest_list_pub_email_idx
  on interest_list (publication_id, email);
create index if not exists interest_list_pub_idx on interest_list (publication_id);
