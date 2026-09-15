-- VYRAL scheduled publishing queue
create extension if not exists pgcrypto;

create table if not exists public.scheduled_publications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  scheduled_at timestamptz not null,
  timezone text not null default 'UTC',
  caption text not null default '',
  privacy_level text,
  platforms text[] not null default array['tiktok']::text[],
  targets jsonb not null default '[]'::jsonb,
  storage_bucket text not null default 'scheduled-media',
  storage_path text not null,
  mime_type text,
  file_name text,
  file_size bigint,
  status text not null default 'scheduled' check (status in ('scheduled','processing','published','partial','failed','cancelled','awaiting_api')),
  attempts integer not null default 0,
  last_error text,
  platform_results jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create index if not exists scheduled_publications_due_idx
  on public.scheduled_publications (status, scheduled_at);
create index if not exists scheduled_publications_user_idx
  on public.scheduled_publications (user_id, created_at desc);

alter table public.scheduled_publications enable row level security;

-- The app accesses this queue server-side with SUPABASE_SERVICE_ROLE_KEY.
-- Media is private and signed/downloaded only by the server worker.
insert into storage.buckets (id, name, public)
values ('scheduled-media', 'scheduled-media', false)
on conflict (id) do update set public = false;
