import { useEffect, useState } from "react";
import Icon from "../components/Icon.jsx";
import { I18N } from "../data/i18n.js";
import { useStore } from "../store/AppStore.jsx";
import { supabase } from "../lib/supabase.js";
import { useToast } from "../components/Toast.jsx";

const ROLES = ["admin", "manager", "member"];

/* Admin-only user management. Reads profiles directly; all privileged
   mutations go through the admin-users Edge Function (service role). */
export default function Users() {
  const { settings } = useStore();
  const { lang } = settings;
  const t = I18N[lang];
  const { notify } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", username: "", role: "member", password: "" });
  const [err, setErr] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("profiles").select("id, name, username, role, active").order("name");
    setRows(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const call = async (body) => {
    setErr("");
    const { data, error } = await supabase.functions.invoke("admin-users", { body });
    if (error || data?.error) {
      setErr(data?.error || error.message);
      return false;
    }
    return true;
  };

  const create = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.username.trim() || !form.password) return;
    if (await call({ action: "create", ...form, username: form.username.trim().toLowerCase() })) {
      notify(t.toast_created);
      setForm({ name: "", username: "", role: "member", password: "" });
      setCreating(false);
      load();
    }
  };

  const setRole = async (id, role) => { if (await call({ action: "set_role", id, role })) { notify(t.toast_logged); load(); } };
  const setActive = async (id, active) => { if (await call({ action: "set_active", id, active })) { notify(t.toast_logged); load(); } };
  const resetPw = async (id) => {
    const pw = window.prompt(lang === "ar" ? "كلمة المرور الجديدة:" : "New password:");
    if (pw && (await call({ action: "reset_password", id, password: pw }))) notify(t.toast_logged);
  };

  const roleLabel = (r) => (r === "admin" ? (lang === "ar" ? "مدير عام" : "Admin") : r === "manager" ? t.role_manager : t.role_member);

  return (
    <div className="content">
      <div className="page-header">
        <div>
          <h1 className="h">{lang === "ar" ? "المستخدمون" : "Users"}</h1>
          <p className="sub">{rows.length} {lang === "ar" ? "حساب" : "accounts"}</p>
        </div>
        <div className="actions">
          <button className="btn btn-primary" onClick={() => setCreating((c) => !c)}><Icon name="plus" size={13} /> {lang === "ar" ? "مستخدم جديد" : "New user"}</button>
        </div>
      </div>

      {err && <div className="callout" style={{ background: "var(--hue-urgent-bg)", borderColor: "oklch(0.85 0.06 40)", color: "var(--hue-urgent)", marginBottom: 14 }}><Icon name="x" size={14} /> {err}</div>}

      {creating && (
        <form className="quote-form" style={{ marginBottom: 18 }} onSubmit={create}>
          <div className="qf-row">
            <label className="qf-cell"><span className="qf-label">{lang === "ar" ? "الاسم" : "Name"}</span><input className="qf" dir="auto" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus /></label>
            <label className="qf-cell"><span className="qf-label">{lang === "ar" ? "اسم المستخدم" : "Username"}</span><input className="qf" autoCapitalize="none" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></label>
          </div>
          <div className="qf-row">
            <label className="qf-cell"><span className="qf-label">{lang === "ar" ? "الدور" : "Role"}</span>
              <select className="qf" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>{ROLES.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}</select>
            </label>
            <label className="qf-cell"><span className="qf-label">{lang === "ar" ? "كلمة مرور مؤقتة" : "Temp password"}</span><input className="qf" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
          </div>
          <div className="qf-row" style={{ justifyContent: "flex-end", gap: 6 }}>
            <button type="button" className="btn btn-ghost" onClick={() => setCreating(false)}>{t.cancel}</button>
            <button type="submit" className="btn btn-primary"><Icon name="check" size={12} /> {lang === "ar" ? "إنشاء" : "Create"}</button>
          </div>
        </form>
      )}

      <div className="list-wrap">
        <div className="list-row header" style={{ gridTemplateColumns: "1fr 140px 140px 1fr" }}>
          <span>{lang === "ar" ? "الاسم" : "Name"}</span><span>{lang === "ar" ? "المستخدم" : "Username"}</span><span>{lang === "ar" ? "الدور" : "Role"}</span><span></span>
        </div>
        {loading && <div className="empty">…</div>}
        {!loading && rows.map((u) => (
          <div className="list-row" key={u.id} style={{ gridTemplateColumns: "1fr 140px 140px 1fr", cursor: "default" }}>
            <div className="ttl" style={{ opacity: u.active ? 1 : 0.5 }}>{u.name}{!u.active && <span className="muted" style={{ fontSize: 11 }}> · {lang === "ar" ? "معطّل" : "inactive"}</span>}</div>
            <div className="mono" style={{ fontSize: 12.5, color: "var(--ink-500)" }}>{u.username}</div>
            <div>
              <select value={u.role} onChange={(e) => setRole(u.id, e.target.value)} style={{ fontSize: 12.5, padding: "3px 6px", border: "1px solid var(--line)", borderRadius: 6, background: "var(--bg-elev)" }}>
                {ROLES.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => resetPw(u.id)}>{lang === "ar" ? "كلمة المرور" : "Reset password"}</button>
              <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => setActive(u.id, !u.active)}>{u.active ? (lang === "ar" ? "تعطيل" : "Deactivate") : (lang === "ar" ? "تفعيل" : "Activate")}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
