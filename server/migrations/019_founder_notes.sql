-- Wave N+ — Founder notes.
-- A small admin-authored editorial note that renders atop the brief view (and email).
-- Used sparingly: when the founder wants to say something specific to subscribers
-- alongside the AI-generated brief — a personal thread, a heads-up, a launch note.

create table if not exists founder_notes (
  id uuid primary key default gen_random_uuid(),
  body text not null check (length(body) <= 400),
  -- "all" = shows in every subscriber's brief; "self" = shows only in author's brief (for testing)
  audience text not null default 'all' check (audience in ('all', 'self')),
  created_by uuid references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  -- Optional expiry — past expires_at, note no longer surfaces
  expires_at timestamptz
);

create index if not exists founder_notes_active_idx
  on founder_notes (created_at desc) where expires_at is null or expires_at > now();
