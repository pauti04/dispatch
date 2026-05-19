-- Public-handle field for sharable bookmark profiles at /p/<handle>.
-- Handles are opt-in; users without a handle have no public profile.
-- Bookmarks default to private; users toggle individual bookmarks public.

alter table users
  add column if not exists handle citext unique;

alter table bookmarks
  add column if not exists is_public bool not null default false;

-- Used by /p/:handle to find a user, and by /api/discover to aggregate public bookmarks
create index if not exists bookmarks_public_idx
  on bookmarks (user_id) where is_public = true;
create index if not exists bookmarks_global_public_idx
  on bookmarks (saved_at desc) where is_public = true;
