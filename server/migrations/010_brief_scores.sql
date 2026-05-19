-- LLM-as-judge scores for each generated brief. Used for prompt iteration + drift detection.
-- All scores 1-5. Notes optional, capped to 400 chars.

create table if not exists brief_scores (
  id uuid primary key default gen_random_uuid(),
  edition_slug text references editions(slug) on delete cascade,
  -- For anonymous /api/brief calls we don't have an edition row, so use a synthetic key
  request_id text,
  variant_id text,
  coherence smallint check (coherence between 1 and 5),
  career_relevance smallint check (career_relevance between 1 and 5),
  voice_fidelity smallint check (voice_fidelity between 1 and 5),
  overall smallint generated always as ((coalesce(coherence,0) + coalesce(career_relevance,0) + coalesce(voice_fidelity,0))) stored,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists brief_scores_created_idx on brief_scores (created_at desc);
create index if not exists brief_scores_variant_idx on brief_scores (variant_id, created_at desc) where variant_id is not null;
