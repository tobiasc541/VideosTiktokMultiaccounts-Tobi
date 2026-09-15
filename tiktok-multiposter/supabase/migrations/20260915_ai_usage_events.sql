create table if not exists public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  feature text not null,
  model text not null,
  input_tokens bigint not null default 0,
  cached_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  cost_usd numeric(14,8) not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists ai_usage_events_user_created_idx on public.ai_usage_events(user_id,created_at desc);
alter table public.ai_usage_events enable row level security;
-- No client policies: usage accounting is server/service-role only.
