-- Invite tokens: each user can generate a personal /i/<token> link.
-- When a new user signs up via that link, we attribute it.
create table if not exists invites (
  token text primary key,
  owner_user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists invite_redemptions (
  id uuid primary key default gen_random_uuid(),
  invite_token text not null references invites(token) on delete cascade,
  redeemed_by_user_id uuid not null references users(id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  unique (invite_token, redeemed_by_user_id)
);

create index if not exists invites_owner_idx on invites (owner_user_id);
create index if not exists invite_redemptions_owner_lookup on invite_redemptions (invite_token);
