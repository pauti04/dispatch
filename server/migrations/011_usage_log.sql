-- Per-call usage tracking for OpenAI spend.
create table if not exists usage_log (
  id bigserial primary key,
  user_id uuid references users(id) on delete set null,
  endpoint text not null,       -- "/api/brief", "cron", "tts", "judge", "embed"
  model text not null,
  prompt_tokens int,
  completion_tokens int,
  total_tokens int,
  -- pre-computed micro-USD cost for fast aggregation (avoids price tables in queries)
  cost_micro_usd int,
  created_at timestamptz not null default now()
);

create index if not exists usage_log_created_idx on usage_log (created_at desc);
create index if not exists usage_log_user_day on usage_log (user_id, date_trunc('day', created_at) desc);
create index if not exists usage_log_endpoint_idx on usage_log (endpoint, created_at desc);
