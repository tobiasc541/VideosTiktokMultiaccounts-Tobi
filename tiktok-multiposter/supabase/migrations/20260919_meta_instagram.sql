create extension if not exists pgcrypto;
create table if not exists public.meta_instagram_accounts (
 id uuid primary key default gen_random_uuid(), user_id uuid not null, instagram_user_id text not null,
 username text, display_name text, account_type text, access_token text not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(user_id,instagram_user_id)
);
create index if not exists meta_instagram_accounts_user_idx on public.meta_instagram_accounts(user_id);
alter table public.meta_instagram_accounts enable row level security;
create table if not exists public.meta_webhook_events (
 id uuid primary key default gen_random_uuid(), platform text not null, event_type text, payload jsonb not null,
 received_at timestamptz not null default now(), processed_at timestamptz
);
create index if not exists meta_webhook_events_unprocessed_idx on public.meta_webhook_events(processed_at,received_at);
alter table public.meta_webhook_events enable row level security;
