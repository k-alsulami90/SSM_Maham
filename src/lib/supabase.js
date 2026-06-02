import { createClient } from "@supabase/supabase-js";

/* Supabase client. When env vars are absent the app stays in local/offline
   mode (mock data + localStorage) and `supabase` is null. */

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anon);

export const supabase = isSupabaseConfigured
  ? createClient(url, anon, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;

// Usernames map to an internal auth email — users only ever type their username.
const DOMAIN = import.meta.env.VITE_USERNAME_DOMAIN || "users.maham.local";
export const usernameToEmail = (username) =>
  `${String(username || "").trim().toLowerCase()}@${DOMAIN}`;
