-- ============================================================
--  Mahām · Expansion migration
--  Adds: Suppliers (+ data-driven evaluation), centralized
--  Maintenance logs, and an expanded Asset registry.
--
--  Run this in the Supabase SQL editor AFTER schema.sql.
--  It is idempotent — safe to run again.
--
--  Access: these are operational tables → staff (admin/manager)
--  have full access; members have none (they only see their tasks).
-- ============================================================

-- ---------- Enums ----------
do $$ begin create type public.asset_status as enum ('working','maintenance','broken','disposed'); exception when duplicate_object then null; end $$;
do $$ begin create type public.maint_type   as enum ('preventive','corrective');                 exception when duplicate_object then null; end $$;
do $$ begin create type public.maint_status as enum ('scheduled','in_progress','completed');      exception when duplicate_object then null; end $$;
do $$ begin create type public.maint_target as enum ('vehicle','asset','facility');               exception when duplicate_object then null; end $$;

-- ============================================================
--  Suppliers — vendors, workshops, parts suppliers, etc.
-- ============================================================
create table if not exists public.suppliers (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  category      text,                       -- spare parts / external workshop / maintenance …
  tax_number    text,
  cr_number     text,
  contact_name  text,
  phone         text,
  email         text,
  payment_terms text,                        -- cash / 30-day credit …
  iban          text,
  contract_url  text,
  rating_score  numeric(3,2) not null default 0,  -- weighted average, 0–5 (auto)
  eval_count    int          not null default 0,  -- number of evaluations (auto)
  active        boolean      not null default true,
  data          jsonb        not null default '{}',
  created_at    timestamptz  not null default now(),
  updated_at    timestamptz  not null default now()
);
alter table public.suppliers enable row level security;

-- ============================================================
--  Supplier evaluations — one row per rating event. The 4 KPIs
--  (1–5) are weighted: Quality 30%, Timeliness 30%, Cost 20%,
--  Service 20%. suppliers.rating_score is the average of these,
--  recomputed automatically by the trigger below.
-- ============================================================
create table if not exists public.supplier_evaluations (
  id             uuid primary key default gen_random_uuid(),
  supplier_id    uuid not null references public.suppliers(id) on delete cascade,
  maintenance_id uuid,                       -- optional: the log that prompted it
  quality        int not null check (quality    between 1 and 5),
  timeliness     int not null check (timeliness between 1 and 5),
  cost           int not null check (cost       between 1 and 5),
  service        int not null check (service    between 1 and 5),
  weighted_score numeric(3,2) not null,      -- quality*.3 + timeliness*.3 + cost*.2 + service*.2
  note           text,
  created_by     uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now()
);
alter table public.supplier_evaluations enable row level security;
create index if not exists idx_eval_supplier on public.supplier_evaluations(supplier_id);

create or replace function public.recompute_supplier_rating()
returns trigger language plpgsql security definer set search_path = public as $$
declare sid uuid;
begin
  sid := coalesce(new.supplier_id, old.supplier_id);
  update public.suppliers s set
    rating_score = coalesce((select round(avg(weighted_score)::numeric, 2)
                             from public.supplier_evaluations where supplier_id = sid), 0),
    eval_count   = (select count(*) from public.supplier_evaluations where supplier_id = sid),
    updated_at   = now()
  where s.id = sid;
  return null;
end $$;

drop trigger if exists trg_recompute_rating on public.supplier_evaluations;
create trigger trg_recompute_rating
  after insert or update or delete on public.supplier_evaluations
  for each row execute function public.recompute_supplier_rating();

-- ============================================================
--  Maintenance logs — centralized across all asset kinds.
--  target_type + target_id are polymorphic so a log can point at
--  a vehicle, an asset, or a facility (e.g. the head office) while
--  keeping one queryable history. (Vehicles & assets keep their
--  own text ids; target_label stores a human-readable name.)
-- ============================================================
create table if not exists public.maintenance_logs (
  id               uuid primary key default gen_random_uuid(),
  target_type      public.maint_target not null default 'asset',
  target_id        text,                     -- vehicles.id / assets.id ; null for facility
  target_label     text,                     -- e.g. "المكتب الرئيسي" or the asset's name
  maintenance_type public.maint_type   not null default 'corrective',
  log_date         date,
  scheduled_date   date,                     -- for preventive / upcoming work
  description      text,
  technician_id    uuid references public.profiles(id)  on delete set null,
  supplier_id      uuid references public.suppliers(id) on delete set null,
  cost             numeric(12,2) default 0,
  parts_replaced   jsonb not null default '[]',  -- [{ name, qty, cost }]
  meter_reading    int,                      -- mileage / operating hours
  status           public.maint_status not null default 'scheduled',
  data             jsonb not null default '{}',
  created_by       uuid references public.profiles(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
alter table public.maintenance_logs enable row level security;
create index if not exists idx_maint_target   on public.maintenance_logs(target_type, target_id);
create index if not exists idx_maint_status   on public.maintenance_logs(status);
create index if not exists idx_maint_supplier on public.maintenance_logs(supplier_id);
create index if not exists idx_maint_sched     on public.maintenance_logs(scheduled_date);

-- ============================================================
--  Expand the asset registry (additive — existing rows untouched).
-- ============================================================
alter table public.assets add column if not exists asset_tag            text;
alter table public.assets add column if not exists name                 text;
alter table public.assets add column if not exists serial_number        text;
alter table public.assets add column if not exists location             text;
alter table public.assets add column if not exists status               public.asset_status default 'working';
alter table public.assets add column if not exists supplier_id          uuid references public.suppliers(id) on delete set null;
alter table public.assets add column if not exists purchase_date        date;
alter table public.assets add column if not exists purchase_cost        numeric(12,2);
alter table public.assets add column if not exists warranty_expiry      date;
alter table public.assets add column if not exists useful_life_years    int;
alter table public.assets add column if not exists next_maintenance_date date;
create unique index if not exists uq_assets_tag on public.assets(asset_tag) where asset_tag is not null;

-- Grouped / bulk tracking: 'unique' = one serialized item per row,
-- 'bulk' = a counted quantity of identical non-serialized items (desks, mice…).
-- make/model give structured grouping (Category → Make → Model) for the
-- aggregated register view ("25 Lenovo laptops in Head Office").
do $$ begin create type public.asset_tracking as enum ('unique','bulk'); exception when duplicate_object then null; end $$;
alter table public.assets add column if not exists tracking public.asset_tracking not null default 'unique';
alter table public.assets add column if not exists quantity int not null default 1;
alter table public.assets add column if not exists make  text;   -- brand, e.g. Lenovo
alter table public.assets add column if not exists model text;   -- e.g. ThinkPad / 75"
create index if not exists idx_assets_group on public.assets(category, make, model);

-- ============================================================
--  RLS — staff full access; members none.
-- ============================================================
do $$
declare tbl text;
begin
  foreach tbl in array array['suppliers','supplier_evaluations','maintenance_logs'] loop
    execute format('drop policy if exists %I_staff_all on public.%I;', tbl, tbl);
    execute format(
      'create policy %I_staff_all on public.%I for all to authenticated using (public.is_staff()) with check (public.is_staff());',
      tbl, tbl);
  end loop;
end $$;

-- ============================================================
--  Realtime + API grants (RLS still gates every row).
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array['suppliers','supplier_evaluations','maintenance_logs'] loop
    begin execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null; when undefined_object then null; end;
  end loop;
end $$;

grant select, insert, update, delete
  on public.suppliers, public.supplier_evaluations, public.maintenance_logs
  to authenticated;
