// Mahām · admin-users Edge Function
// Creating/resetting/deactivating users needs the service-role key, which must
// NEVER be exposed in the browser — so it lives here. Every call is verified to
// come from a signed-in **admin** before the privileged client is used.
//
// Deploy:  supabase functions deploy admin-users
// (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const DOMAIN = Deno.env.get("USERNAME_DOMAIN") || "users.maham.local";

const cors = {
  "Access-Control-Allow-Origin": "*",
  // supabase-js auto-adds apikey + x-client-info — they must be allowed or the
  // browser's CORS preflight fails with "Failed to send a request…".
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const emailFor = (username: string) => `${String(username).trim().toLowerCase()}@${DOMAIN}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // 1) Identify the caller from their JWT and require admin role.
  const authHeader = req.headers.get("Authorization") || "";
  const caller = createClient(URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: uErr } = await caller.auth.getUser();
  if (uErr || !user) return json({ error: "Not authenticated" }, 401);

  const { data: me } = await caller.from("profiles").select("role, active").eq("id", user.id).single();
  if (!me || me.role !== "admin" || !me.active) return json({ error: "Admin only" }, 403);

  // 2) Privileged client (service role) for the actual user operations.
  const admin = createClient(URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Bad JSON" }, 400); }
  const { action } = body;

  try {
    if (action === "create") {
      const { name, username, role, password } = body;
      if (!name || !username || !password) return json({ error: "name, username, password required" }, 400);
      const { data, error } = await admin.auth.admin.createUser({
        email: emailFor(username),
        password,
        email_confirm: true,
        user_metadata: { name, username, role: role || "member" },
      });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true, id: data.user?.id });
    }

    if (action === "reset_password") {
      const { id, password } = body;
      if (!id || !password) return json({ error: "id, password required" }, 400);
      const { error } = await admin.auth.admin.updateUserById(id, { password });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === "update_profile") {
      const { id, name, username } = body;
      if (!id) return json({ error: "id required" }, 400);
      const updates: Record<string, unknown> = {};
      if (typeof name === "string" && name.trim()) updates.name = name.trim();
      if (typeof username === "string" && username.trim()) updates.username = username.trim().toLowerCase();
      if (!Object.keys(updates).length) return json({ error: "nothing to update" }, 400);
      // A username change is also a login-identity change → update the auth email.
      if (updates.username) {
        const meta: Record<string, unknown> = { username: updates.username };
        if (updates.name) meta.name = updates.name;
        const { error: aErr } = await admin.auth.admin.updateUserById(id, {
          email: emailFor(updates.username as string),
          user_metadata: meta,
        });
        if (aErr) return json({ error: aErr.message }, 400);
      } else if (updates.name) {
        await admin.auth.admin.updateUserById(id, { user_metadata: { name: updates.name } });
      }
      const { error } = await admin.from("profiles").update(updates).eq("id", id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === "set_role") {
      const { id, role } = body;
      if (!id || !role) return json({ error: "id, role required" }, 400);
      const { error } = await admin.from("profiles").update({ role }).eq("id", id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === "set_active") {
      const { id, active } = body;
      if (typeof active !== "boolean" || !id) return json({ error: "id, active required" }, 400);
      // Ban (deactivate) at the auth layer and mirror the flag on the profile.
      const { error } = await admin.auth.admin.updateUserById(id, { ban_duration: active ? "none" : "876000h" });
      if (error) return json({ error: error.message }, 400);
      await admin.from("profiles").update({ active }).eq("id", id);
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
