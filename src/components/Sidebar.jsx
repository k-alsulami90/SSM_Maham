import { useState } from "react";
import Icon from "./Icon.jsx";
import Avatar from "./Avatar.jsx";
import * as D from "../data/mock.js";
import { I18N } from "../data/i18n.js";
import { useStore } from "../store/AppStore.jsx";
import { useAuth } from "../auth/AuthProvider.jsx";

/* Left navigation. Items adapt to the signed-in role (RBAC). The user card
   opens a popover to switch roles (mock auth) and reset demo data. */
export default function Sidebar({ active, onNav, onOpenProject, onAddProject, counts, onClose, isMobile }) {
  const { settings, dispatch } = useStore();
  const { lang, role, currentUserId } = settings;
  const t = I18N[lang];
  const auth = useAuth();
  const currentUser = D.findUser(currentUserId);
  const [menu, setMenu] = useState(false);

  // On mobile we keep it task-focused (no analytics dashboard / team roster).
  const items =
    role === "manager"
      ? (isMobile
          ? [
              { id: "hub", label: t.task_hub, icon: "hub" },
              { id: "approvals", label: t.approvals, icon: "approve", count: counts.review },
              { id: "recurring", label: t.recurring, icon: "repeat" },
              { id: "activity", label: t.activity, icon: "activity" },
            ]
          : [
              { id: "dashboard", label: t.dashboard, icon: "dashboard" },
              { id: "hub", label: t.task_hub, icon: "hub" },
              { id: "approvals", label: t.approvals, icon: "approve", count: counts.review },
              { id: "recurring", label: t.recurring, icon: "repeat" },
              { id: "team", label: t.team, icon: "team" },
              { id: "activity", label: t.activity, icon: "activity" },
            ])
      : [
          { id: "dashboard", label: t.my_tasks, icon: "tasks", count: counts.mine },
          { id: "hub", label: t.task_hub, icon: "hub" },
          { id: "inbox", label: t.inbox, icon: "inbox", count: counts.review },
          { id: "recurring", label: t.recurring, icon: "repeat" },
          { id: "activity", label: t.activity, icon: "activity" },
        ];
  if (auth.role === "admin" && !isMobile) items.push({ id: "users", label: lang === "ar" ? "المستخدمون" : "Users", icon: "team" });

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">م</div>
        <div className="brand-name">
          {t.appName}
          <span className="sub">{t.tagline}</span>
        </div>
        <button className="side-close icon-btn" onClick={onClose} aria-label={lang === "ar" ? "إغلاق" : "Close"}>
          <Icon name="x" size={18} />
        </button>
      </div>

      <div className="side-section">
        <div className="label">{t.workspace}</div>
        {items.map((it) => (
          <button
            key={it.id}
            onClick={() => onNav(it.id)}
            className={`nav-item ${active === it.id ? "active" : ""}`}
          >
            <Icon name={it.icon} className="icon" />
            <span>{it.label}</span>
            {it.count > 0 && <span className="count">{it.count}</span>}
          </button>
        ))}
      </div>

      {/* Fleet / assets / maintenance are operational areas — shown to managers
          & admins on desktop only. Mobile stays task-focused. */}
      {role === "manager" && !isMobile && (
        <div className="side-section">
          <div className="label">{lang === "ar" ? "الأصول والصيانة" : "Assets & Maintenance"}</div>
          {[
            { id: "register", label: t.asset_register, icon: "box" },
            { id: "assets", label: t.assets_dashboard, icon: "gauge" },
            { id: "maintenance", label: t.maintenance, icon: "wrench" },
            { id: "suppliers", label: t.suppliers, icon: "team" },
            { id: "fleet", label: t.fleet_dashboard, icon: "car" },
            { id: "vehicles", label: t.vehicles, icon: "car" },
          ].map((it) => (
            <button key={it.id} onClick={() => onNav(it.id)} className={`nav-item ${active === it.id ? "active" : ""}`}>
              <Icon name={it.icon} className="icon" />
              <span>{it.label}</span>
            </button>
          ))}
        </div>
      )}

      {role === "manager" && !isMobile && (
        <div className="side-section">
          <div className="label" style={{ display: "flex", alignItems: "center" }}>
            <span>{t.projects}</span>
            <button onClick={onAddProject} title={t.new_project} aria-label={t.new_project} style={{ marginInlineStart: "auto", color: "var(--ink-400)", display: "grid", placeItems: "center", width: 18, height: 18, borderRadius: 4 }}>
              <Icon name="plus" size={13} />
            </button>
          </div>
          {D.getProjects().map((p) => (
            <button key={p.id} className="nav-item" onClick={() => onOpenProject(p.id)}>
              <span className="icon" style={{ width: 10, height: 10, borderRadius: 3, background: D.projectDot(p.id) }} />
              <span style={{ fontSize: 13 }}>{D.projectName(p, lang)}</span>
            </button>
          ))}
        </div>
      )}

      <div style={{ marginTop: "auto", position: "relative" }}>
        {menu && (
          <div className="popover" style={{ bottom: "calc(100% + 8px)", insetInlineStart: 0, insetInlineEnd: 0 }}>
            {auth.configured ? (
              <button className="pop-item" onClick={() => { setMenu(false); auth.signOut(); }}>
                <Icon name="chev_left" size={15} /> {lang === "ar" ? "تسجيل الخروج" : "Sign out"}
              </button>
            ) : (
              <>
                <div className="pop-label">{t.switch_role}</div>
                <button className={`pop-item ${role === "manager" ? "active" : ""}`} onClick={() => { dispatch({ type: "SET_SETTING", key: "role", value: "manager" }); setMenu(false); onNav("dashboard"); }}>
                  <Icon name="approve" size={15} /> {t.role_manager}
                  {role === "manager" && <Icon name="check" size={14} className="chk" />}
                </button>
                <button className={`pop-item ${role === "member" ? "active" : ""}`} onClick={() => { dispatch({ type: "SET_SETTING", key: "role", value: "member" }); setMenu(false); onNav("dashboard"); }}>
                  <Icon name="user" size={15} /> {t.role_member}
                  {role === "member" && <Icon name="check" size={14} className="chk" />}
                </button>
                <hr />
                <button className="pop-item" onClick={() => { dispatch({ type: "RESET" }); setMenu(false); }}>
                  <Icon name="activity" size={15} /> {lang === "ar" ? "إعادة ضبط البيانات" : "Reset demo data"}
                </button>
              </>
            )}
          </div>
        )}
        <button className="user-card" onClick={() => setMenu((m) => !m)}>
          {auth.configured ? (
            <span className="avatar" style={{ width: 30, height: 30, borderRadius: "50%", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 600, color: "#fdf8ec", background: "var(--acc-forest)" }}>
              {(auth.profile?.name || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
            </span>
          ) : (
            <Avatar user={currentUser} size={30} />
          )}
          <div className="meta">
            <div className="name">{auth.configured ? auth.profile?.name : D.userName(currentUser, lang)}</div>
            <div className="role">
              {auth.configured
                ? (auth.role === "admin" ? (lang === "ar" ? "مدير عام" : "Admin") : auth.role === "manager" ? t.role_manager : t.role_member)
                : (role === "manager" ? t.role_manager : t.role_member)}
            </div>
          </div>
          <Icon name="chev_up" className="chev" size={14} />
        </button>
      </div>
    </aside>
  );
}
