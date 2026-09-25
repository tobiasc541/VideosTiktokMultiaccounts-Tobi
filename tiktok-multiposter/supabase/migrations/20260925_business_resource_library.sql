create table if not exists public.vyral_business_resources (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 name text not null,
 kind text not null check (kind in ('file','url')),
 storage_path text,
 external_url text,
 mime_type text,
 purpose text not null default '',
 send_when text not null default '',
 enabled boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists vyral_business_resources_user_idx on public.vyral_business_resources(user_id,created_at desc);
alter table public.vyral_business_resources enable row level security;
revoke all on public.vyral_business_resources from public, anon, authenticated;
grant all on public.vyral_business_resources to service_role;
