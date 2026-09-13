create table if not exists public.tiktok_accounts (
  id uuid primary key default gen_random_uuid(),
  open_id text not null unique,
  display_name text not null,
  avatar_url text,
  access_token_enc text not null,
  refresh_token_enc text not null,
  access_expires_at timestamptz not null,
  refresh_expires_at timestamptz,
  scope text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tiktok_accounts enable row level security;

-- La app usa la service role solo desde el servidor.
-- No creamos policies públicas.
