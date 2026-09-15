create table if not exists public.vyral_business_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  business_name text not null default '',
  industry text not null default '',
  offer text not null default '',
  audience text not null default '',
  tone text not null default '',
  goals text not null default '',
  cta text not null default '',
  country text not null default '',
  extra_context text not null default '',
  updated_at timestamptz not null default now()
);
alter table public.vyral_business_profiles enable row level security;
drop policy if exists "business profile own row" on public.vyral_business_profiles;
create policy "business profile own row" on public.vyral_business_profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
