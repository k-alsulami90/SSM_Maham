import { useState } from "react";
import { supabase, usernameToEmail } from "../lib/supabase.js";

/* Username + password sign-in. No public sign-up — accounts are created by an
   admin. The username is mapped to an internal email for Supabase Auth. */
export default function SignIn() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: usernameToEmail(username),
      password,
    });
    setBusy(false);
    if (error) setError("Incorrect username or password.");
  };

  return (
    <div style={{ height: "100%", display: "grid", placeItems: "center", background: "var(--bg-canvas)", padding: 24 }}>
      <form
        onSubmit={submit}
        style={{
          width: 360, maxWidth: "100%", background: "var(--bg-elev)",
          border: "1px solid var(--line)", borderRadius: "var(--r-xl)",
          boxShadow: "var(--shadow-pop)", padding: 28,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <div className="brand-mark" style={{ width: 36, height: 36, fontSize: 18 }}>م</div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em" }}>Mahām</div>
            <div style={{ fontSize: 12, color: "var(--ink-400)" }}>Team operations</div>
          </div>
        </div>

        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink-500)", marginBottom: 4 }}>Username</label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
          autoCapitalize="none"
          autoComplete="username"
          style={{ width: "100%", padding: "9px 11px", border: "1px solid var(--line-strong)", borderRadius: "var(--r-sm)", background: "var(--bg-elev)", marginBottom: 12, fontSize: 14 }}
        />

        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink-500)", marginBottom: 4 }}>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          style={{ width: "100%", padding: "9px 11px", border: "1px solid var(--line-strong)", borderRadius: "var(--r-sm)", background: "var(--bg-elev)", marginBottom: 14, fontSize: 14 }}
        />

        {error && <div style={{ color: "var(--hue-urgent)", fontSize: 12.5, marginBottom: 12 }}>{error}</div>}

        <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} disabled={busy || !username || !password}>
          {busy ? "Signing in…" : "Sign in"}
        </button>

        <p style={{ fontSize: 11.5, color: "var(--ink-400)", marginTop: 14, textAlign: "center", lineHeight: 1.5 }}>
          Accounts are created by your administrator. Forgot your password? Ask an admin to reset it.
        </p>
      </form>
    </div>
  );
}
