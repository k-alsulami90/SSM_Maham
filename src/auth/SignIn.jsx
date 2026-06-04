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
    if (error) setError("اسم المستخدم أو كلمة المرور غير صحيحة.");
  };

  return (
    <div dir="rtl" style={{ height: "100%", display: "grid", placeItems: "center", background: "var(--bg-canvas)", padding: 24, fontFamily: "var(--font-ar)" }}>
      <form
        onSubmit={submit}
        style={{
          width: 360, maxWidth: "100%", background: "var(--bg-elev)",
          border: "1px solid var(--line)", borderRadius: "var(--r-xl)",
          boxShadow: "var(--shadow-pop)", padding: 28,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <div className="brand-mark" style={{ width: 38, height: 38, fontSize: 19 }}>م</div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em" }}>إدارة الخدمات المساندة</div>
            <div style={{ fontSize: 12, color: "var(--ink-500)" }}>المهام والأصول والصيانة</div>
          </div>
        </div>

        <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--ink-700)", marginBottom: 5 }}>اسم المستخدم</label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
          autoCapitalize="none"
          autoComplete="username"
          dir="ltr"
          style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--line-strong)", borderRadius: "var(--r-md, 10px)", background: "var(--bg-elev)", marginBottom: 14, fontSize: 14, textAlign: "start" }}
        />

        <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--ink-700)", marginBottom: 5 }}>كلمة المرور</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          dir="ltr"
          style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--line-strong)", borderRadius: "var(--r-md, 10px)", background: "var(--bg-elev)", marginBottom: 16, fontSize: 14, textAlign: "start" }}
        />

        {error && <div style={{ color: "var(--hue-urgent)", fontSize: 12.5, marginBottom: 12 }}>{error}</div>}

        <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} disabled={busy || !username || !password}>
          {busy ? "جارٍ تسجيل الدخول…" : "تسجيل الدخول"}
        </button>

        <p style={{ fontSize: 11.5, color: "var(--ink-500)", marginTop: 16, textAlign: "center", lineHeight: 1.6 }}>
          الحسابات يتم إنشاؤها من قِبل المسؤول. نسيت كلمة المرور؟ اطلب من المسؤول إعادة تعيينها.
        </p>
      </form>
    </div>
  );
}
