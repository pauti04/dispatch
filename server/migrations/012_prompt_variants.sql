-- Prompt variants registry — for running A/B tests over the editor prompt.
-- The 'control' row is the live default; experimental variants live alongside with a weight.

create table if not exists prompt_variants (
  id text primary key,
  description text,
  weight smallint not null default 0 check (weight between 0 and 100),  -- 0 = off
  template_overrides jsonb not null default '{}'::jsonb,  -- { editor_voice_note: "...", ... }
  created_at timestamptz not null default now()
);

-- Seed the control variant
insert into prompt_variants (id, description, weight)
values ('control', 'Live default prompt', 100)
on conflict (id) do nothing;
