-- ============================================================
--  Mahām · Supabase schema + Row-Level Security
--  Run this in the Supabase SQL editor (see SETUP_BACKEND.md).
--
--  Access model (admin-controlled, no public sign-up):
--    admin   → sees & edits everything, manages users
--    manager → sees & edits everything, no user management
--    member  → sees only tasks assigned to them; may interact, not create
--  All data is shared in one database; these policies decide who can
--  read / write each row.
-- ============================================================

-- ---------- Roles ----------
do $$ begin
  create type public.app_role as enum ('admin', 'manager', 'member');
exception when duplicate_object then null; end $$;

-- ---------- Profiles (1:1 with auth.users) ----------
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text not null,
  username   text not null unique,
  role       public.app_role not null default 'member',
  active      boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Helper functions run as SECURITY DEFINER so they can read profiles without
-- triggering the table's own RLS (which would recurse).
create or replace function public.current_role()
returns public.app_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin' and active);
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','manager') and active);
$$;

-- Profiles: any signed-in user may read (to show names/avatars); only admins write.
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles
  for select to authenticated using (true);

drop policy if exists profiles_admin_write on public.profiles;
create policy profiles_admin_write on public.profiles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ============================================================
--  Domain tables. Rich child objects (subtasks, quotations,
--  activity, documents, logs) are stored as jsonb to mirror the
--  app's current shapes — no big relational redesign needed.
-- ============================================================

create table if not exists public.tasks (
  id          text primary key,
  type        text not null default 'assignment',
  title       text, ar_title text, descr text, ar_descr text,
  project     text, priority text, status text,
  assignee    uuid references public.profiles(id) on delete set null,
  due         date, created date,
  progress    int default 0,
  vehicle_id  text, asset_id text,
  data        jsonb not null default '{}',  -- subtasks, quotations, activity, attachments…
  updated_at  timestamptz not null default now()
);
alter table public.tasks enable row level security;

-- Staff (admin/manager): full access. Members: only their own tasks,
-- read + update (interact), never insert/delete.
drop policy if exists tasks_staff_all on public.tasks;
create policy tasks_staff_all on public.tasks
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists tasks_member_read on public.tasks;
create policy tasks_member_read on public.tasks
  for select to authenticated using (assignee = auth.uid());

drop policy if exists tasks_member_update on public.tasks;
create policy tasks_member_update on public.tasks
  for update to authenticated using (assignee = auth.uid()) with check (assignee = auth.uid());

-- Recurring templates, vehicles, assets: staff-only (members never see them).
create table if not exists public.recurring_templates (
  id text primary key, data jsonb not null default '{}', updated_at timestamptz not null default now()
);
create table if not exists public.vehicles (
  id text primary key, project text, custodian uuid references public.profiles(id) on delete set null,
  data jsonb not null default '{}', updated_at timestamptz not null default now()
);
create table if not exists public.assets (
  id text primary key, category text, project text, custodian uuid references public.profiles(id) on delete set null,
  data jsonb not null default '{}', updated_at timestamptz not null default now()
);

alter table public.recurring_templates enable row level security;
alter table public.vehicles enable row level security;
alter table public.assets enable row level security;

do $$
declare tbl text;
begin
  foreach tbl in array array['recurring_templates','vehicles','assets'] loop
    execute format('drop policy if exists %I_staff_all on public.%I;', tbl, tbl);
    execute format(
      'create policy %I_staff_all on public.%I for all to authenticated using (public.is_staff()) with check (public.is_staff());',
      tbl, tbl);
  end loop;
end $$;

-- ============================================================
--  New auth user → profile. The admin Edge Function passes name,
--  username and role in user metadata; this trigger materializes
--  the profile row.
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, username, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'username', 'User'),
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::public.app_role, 'member')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Projects (staff-managed; everyone reads) ----------
create table if not exists public.projects (
  id text primary key,
  name text,
  ar text,
  updated_at timestamptz not null default now()
);
alter table public.projects enable row level security;
drop policy if exists projects_read on public.projects;
create policy projects_read on public.projects for select to authenticated using (true);
drop policy if exists projects_write on public.projects;
create policy projects_write on public.projects for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- ============================================================
--  Realtime — publish the shared tables so clients live-update.
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array['tasks','vehicles','assets','recurring_templates','projects','profiles'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null; when undefined_object then null; end;
  end loop;
end $$;

-- ============================================================
--  API role privileges. RLS decides *which rows*; these grants let the
--  signed-in role reach the tables at all (without them PostgREST returns
--  403 even with a correct policy). RLS above still gates every row.
-- ============================================================
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;
-- Cover tables added later, too.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;

-- ============================================================
--  Bootstrap the first admin.
--  1) Create the user in Authentication → Users (or via the Edge
--     Function once deployed). Use email  <username>@users.maham.local
--  2) Then promote them here, e.g.:
--        update public.profiles set role = 'admin'
--        where username = 'admin';
-- ============================================================
