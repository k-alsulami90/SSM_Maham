import { createContext, useContext, useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabase.js";
import SignIn from "./SignIn.jsx";

/* Auth context. In local mode (no Supabase env) this stays { configured:false }
   and the app behaves exactly as before. When configured, it gates the app
   behind a sign-in screen and exposes the signed-in profile + role. */
const AuthCtx = createContext({ configured: false, role: null, profile: null, signOut: () => {} });
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  if (!isSupabaseConfigured) return children;
  return <SupabaseGate>{children}</SupabaseGate>;
}

function SupabaseGate({ children }) {
  const [session, setSession] = useState(undefined); // undefined = still loading
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setProfile(null); return; }
    let off = false;
    supabase
      .from("profiles")
      .select("id, name, username, role, active")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => { if (!off) setProfile(data); });
    return () => { off = true; };
  }, [session]);

  const signOut = () => supabase.auth.signOut();

  if (session === undefined) {
    return <div style={{ height: "100%", display: "grid", placeItems: "center", color: "var(--ink-400)" }}>…</div>;
  }
  if (!session) return <SignIn />;
  // Inactive accounts are also banned at the auth layer; this is a belt-and-braces guard.
  if (profile && profile.active === false) {
    return (
      <div style={{ height: "100%", display: "grid", placeItems: "center", textAlign: "center", padding: 24 }}>
        <div>
          <p style={{ marginBottom: 12 }}>Your account is deactivated. Contact an administrator.</p>
          <button className="btn btn-secondary" onClick={signOut}>Sign out</button>
        </div>
      </div>
    );
  }

  return (
    <AuthCtx.Provider value={{ configured: true, role: profile?.role || null, profile, signOut }}>
      {children}
    </AuthCtx.Provider>
  );
}
