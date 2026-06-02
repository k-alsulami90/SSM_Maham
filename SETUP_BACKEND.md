# Mahām · Backend setup (Supabase)

This connects the app to a shared database with **admin-controlled accounts** and
**row-level security**. Until you complete it, the app runs in local/offline mode
(mock data + localStorage) — so it's safe to do this whenever you're ready.

## Access model
- **admin** — sees & edits everything **and** manages users.
- **manager** — sees & edits everything; cannot manage users.
- **member** — sees only tasks assigned to them; can interact, not create.

No public sign-up: an admin creates every account. Users sign in with **username + password**.

---

## 1. Create the project
1. Go to [supabase.com](https://supabase.com) → **New project** (free tier is fine). Pick a region close to you.
2. Project Settings → **API**: copy the **Project URL** and the **anon public** key.

## 2. Point the app at it
Copy `.env.example` to `.env` and fill in:
```
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ... (anon public key)
VITE_USERNAME_DOMAIN=users.maham.local
```
Restart `npm run dev`. The app now shows a **sign-in screen**.

## 3. Create the database
Open Supabase → **SQL Editor** → paste the contents of [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
This creates the `profiles` table, the role types, all RLS policies, and the
new-user trigger.

## 4. Deploy the user-management function
Creating users needs the service-role key, so it runs server-side in an Edge Function.

Install the CLI once, then from the project folder:
```
supabase login
supabase link --project-ref YOUR-PROJECT-REF
supabase functions deploy admin-users
# set the username domain the function uses (must match VITE_USERNAME_DOMAIN)
supabase secrets set USERNAME_DOMAIN=users.maham.local
```
(`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are provided to the function automatically.)

## 5. Create the first admin (bootstrap)
1. Supabase → **Authentication → Users → Add user**.
   - Email: `admin@users.maham.local`  (i.e. `<username>@<your USERNAME_DOMAIN>`)
   - Password: choose one · tick **Auto confirm user**.
2. Supabase → **SQL Editor**, run:
   ```sql
   update public.profiles set role = 'admin', name = 'Administrator'
   where username = 'admin';
   ```
   (If the row isn't there yet, the trigger creates it on first sign-in — just rerun this after.)
3. Sign in to the app as `admin`. Open **Users** in the sidebar to create everyone else
   (name, username, role, temporary password). No SQL needed after this.

---

## What's live after this (Phase 1)
- Real sign-in (username + password), admin-managed accounts, role from the database.
- RLS enforces who can read/write — even if the UI were bypassed.

## Phase 2 — shared live data (now implemented)
The app now reads/writes tasks, vehicles, assets, recurring templates, and projects to
Supabase, with **realtime** so every signed-in device stays in sync. RLS enforces
"members see only their tasks" in the database.

**To activate it, re-run `supabase/schema.sql`** (it now also creates the `projects`
table and adds the tables to the realtime publication — safe to run again).

How it behaves:
- On first connected load, your current local data (the real fleet + projects) is
  **pushed up once** to seed the empty tables.
- After that, the database is the source of truth; local storage is just an offline cache.
- Every create/edit/delete mirrors to Supabase and broadcasts to other users live.

Verify on your project: sign in on two browsers (e.g. an admin and a member) — create a
task as the manager, assign it to the member, and confirm it appears for the member and
**not** for other members. Check the browser console for any `[sync]` errors and send them
over if something doesn't save.
