-- Durable, multi-tenant per-account publishing queue.
create table if not exists public.publish_target_jobs (
 id uuid primary key default gen_random_uuid(),
 publication_id text not null references public.scheduled_publications(id) on delete cascade,
 user_id text not null,
 platform text not null check(platform in ('tiktok','instagram','facebook')),
 account_id text not null,
 account_name text,
 status text not null default 'queued' check(status in ('queued','processing','published','retry','failed','awaiting_api')),
 attempts integer not null default 0,
 next_attempt_at timestamptz not null default now(),
 lease_until timestamptz,
 worker_id text,
 result jsonb not null default '{}'::jsonb,
 last_error text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 published_at timestamptz,
 unique(publication_id,platform,account_id)
);
create index if not exists publish_target_jobs_ready_idx on public.publish_target_jobs(status,next_attempt_at,created_at);
create index if not exists publish_target_jobs_user_idx on public.publish_target_jobs(user_id,created_at desc);
create index if not exists publish_target_jobs_account_idx on public.publish_target_jobs(platform,account_id,created_at desc);
alter table public.publish_target_jobs enable row level security;
create or replace function public.claim_publish_target_jobs(p_limit integer,p_worker text,p_lease_seconds integer default 240)
returns setof public.publish_target_jobs language plpgsql security definer set search_path=public as $$
begin
 return query
 with candidates as (
  select j.id from public.publish_target_jobs j
  where (j.status in ('queued','retry') and j.next_attempt_at<=now()) or (j.status='processing' and j.lease_until<now())
  order by j.next_attempt_at,j.created_at for update skip locked limit greatest(1,least(p_limit,100))
 ), claimed as (
  update public.publish_target_jobs j set status='processing',attempts=j.attempts+1,
   lease_until=now()+make_interval(secs=>greatest(30,p_lease_seconds)),worker_id=p_worker,updated_at=now()
  from candidates c where j.id=c.id returning j.*
 )
 select * from claimed;
end $$;
revoke all on function public.claim_publish_target_jobs(integer,text,integer) from public;
