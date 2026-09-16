create table if not exists public.business_expenses (
 id uuid primary key default gen_random_uuid(),
 category text not null check (category in ('advertising','employees','infrastructure','other')),
 description text not null,
 amount_usd numeric(14,2) not null check (amount_usd >= 0),
 expense_date date not null default current_date,
 recurring boolean not null default false,
 created_at timestamptz not null default now()
);
create index if not exists business_expenses_date_idx on public.business_expenses(expense_date desc);
alter table public.business_expenses enable row level security;
-- Admin/service-role only. No browser policies.
