create extension if not exists pgcrypto;

create table if not exists public.kols (
  id text primary key,
  name text not null,
  symbol text not null,
  x_handle text not null,
  x_url text not null,
  avatar_url text,
  token_mint text,
  market_url text,
  terminal_url text,
  fee_wallet text,
  wins integer not null default 0,
  losses integer not null default 0,
  seed integer not null,
  color text not null,
  fallback_market_cap_usd numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.race_intervals (
  id text primary key,
  label text not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'live', 'completed', 'paused')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  entrant_ids text[] not null,
  snapshot_start jsonb,
  snapshot_end jsonb,
  live_market_caps jsonb,
  winner_kol_id text references public.kols(id),
  kol_fees_sol numeric not null default 0,
  entrant_fees_sol numeric not null default 0,
  distribution_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint race_has_entrants check (array_length(entrant_ids, 1) >= 2)
);

create table if not exists public.distributions (
  id text primary key,
  race_id text not null references public.race_intervals(id) on delete cascade,
  winning_kol_id text not null references public.kols(id),
  winner_holders_amount_sol numeric not null default 0,
  kol_airdrop_amount_sol numeric not null default 0,
  buyback_burn_amount_sol numeric not null default 0,
  finals_vault_amount_sol numeric not null default 0,
  tx_status text not null default 'queued' check (tx_status in ('queued', 'ready', 'complete', 'failed')),
  ready_at timestamptz not null,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  payout_plan jsonb,
  tx_signatures jsonb not null default '[]'::jsonb,
  failed_reason text
);

create table if not exists public.holder_snapshots (
  id text primary key,
  race_id text not null references public.race_intervals(id) on delete cascade,
  mint text not null,
  kind text not null check (kind in ('winner_kol', 'kol_airdrop')),
  captured_at timestamptz not null,
  holder_count integer not null default 0,
  total_token_amount numeric not null default 0,
  holders jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.system_logs (
  id uuid primary key default gen_random_uuid(),
  level text not null check (level in ('info', 'warn', 'error')),
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists race_intervals_status_idx on public.race_intervals(status);
create index if not exists race_intervals_time_idx on public.race_intervals(starts_at, ends_at);
create index if not exists distributions_status_idx on public.distributions(tx_status);
create index if not exists holder_snapshots_race_idx on public.holder_snapshots(race_id);
create index if not exists system_logs_created_at_idx on public.system_logs(created_at desc);

alter table public.kols enable row level security;
alter table public.race_intervals enable row level security;
alter table public.distributions enable row level security;
alter table public.holder_snapshots enable row level security;
alter table public.system_logs enable row level security;
