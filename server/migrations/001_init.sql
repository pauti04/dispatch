create extension if not exists "pgcrypto";
create extension if not exists "citext";

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email citext unique not null,
  name text,
  timezone text not null default 'UTC',
  send_time time not null default '08:00',
  send_days text[] not null default array['mon','tue','wed','thu','fri'],
  status text not null default 'active',
  unsubscribe_token text unique not null default encode(gen_random_bytes(24), 'hex'),
  role text not null default 'software_engineer',
  skill_level text not null default 'intermediate',
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

create table if not exists prefs (
  user_id uuid primary key references users(id) on delete cascade,
  topics text[] not null,
  depth text not null default 'standard',
  updated_at timestamptz not null default now()
);

create table if not exists login_tokens (
  token text primary key,
  user_id uuid not null references users(id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz
);

create table if not exists editions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  edition_date date not null,
  slug text unique not null,
  data jsonb not null,
  status text not null default 'queued',
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, edition_date)
);

create index if not exists editions_user_date_idx on editions (user_id, edition_date desc);
create index if not exists login_tokens_user_idx on login_tokens (user_id);
