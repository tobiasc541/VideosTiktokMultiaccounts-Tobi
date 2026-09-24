-- Security hardening: durable login throttling + one-time OAuth state.
create table if not exists public.auth_rate_limits (
  key_hash text primary key, attempts integer not null default 0,
  window_start timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.auth_rate_limits enable row level security;
revoke all on table public.auth_rate_limits from public, anon, authenticated;
grant all on table public.auth_rate_limits to service_role;

create table if not exists public.oauth_transactions (
  state_hash text primary key,
  provider text not null check (provider in ('instagram','tiktok')),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null, plan text,
  expires_at timestamptz not null, created_at timestamptz not null default now()
);
alter table public.oauth_transactions enable row level security;
revoke all on table public.oauth_transactions from public, anon, authenticated;
grant all on table public.oauth_transactions to service_role;
create index if not exists oauth_transactions_expires_idx on public.oauth_transactions(expires_at);

create or replace function public.consume_login_attempt(p_key_hash text,p_limit integer default 8,p_window_seconds integer default 900)
returns boolean language plpgsql security definer set search_path=public as $$
declare v_attempts integer; v_start timestamptz;
begin
 insert into public.auth_rate_limits(key_hash,attempts,window_start,updated_at) values(p_key_hash,1,now(),now())
 on conflict(key_hash) do update set
 attempts=case when auth_rate_limits.window_start < now()-make_interval(secs=>p_window_seconds) then 1 else auth_rate_limits.attempts+1 end,
 window_start=case when auth_rate_limits.window_start < now()-make_interval(secs=>p_window_seconds) then now() else auth_rate_limits.window_start end,
 updated_at=now()
 returning attempts,window_start into v_attempts,v_start;
 return v_attempts<=p_limit;
end $$;
revoke all on function public.consume_login_attempt(text,integer,integer) from public,anon,authenticated;
grant execute on function public.consume_login_attempt(text,integer,integer) to service_role;

create or replace function public.clear_login_attempts(p_key_hash text)
returns void language sql security definer set search_path=public as $$
 delete from public.auth_rate_limits where key_hash=p_key_hash;
$$;
revoke all on function public.clear_login_attempts(text) from public,anon,authenticated;
grant execute on function public.clear_login_attempts(text) to service_role;
