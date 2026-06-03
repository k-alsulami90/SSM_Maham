import { useState } from "react";
import Icon from "./Icon.jsx";
import { I18N, ACCENT_SWATCH } from "../data/i18n.js";
import { useStore } from "../store/AppStore.jsx";
import * as D from "../data/mock.js";

/* Top bar — breadcrumbs, search, notifications, settings, install, new task. */
export default function Topbar({ crumbs, isMobile, onNew, onMenu, onSearch, onOpenTask, canInstall, onInstall }) {
  const { settings, tasks, dispatch } = useStore();
  const { lang, accent, theme, uiSize, role, currentUserId } = settings;
  const t = I18N[lang];
  const [open, setOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const setSetting = (key, value) => dispatch({ type: "SET_SETTING", key, value });

  // Notifications: things needing attention — items in review + overdue tasks.
  const scope = role === "member" ? tasks.filter((x) => x.assignee === currentUserId) : tasks;
  const notifs = scope
    .filter((x) => x.status === "review" || (x.status !== "done" && D.daysUntil(x.due) < 0))
    .sort((a, b) => new Date(a.due) - new Date(b.due))
    .slice(0, 10);

  return (
    <div className="topbar">
      {!isMobile && (
        <button className="icon-btn menu-btn" onClick={onMenu} aria-label="Menu">
          <Icon name="list" size={18} />
        </button>
      )}

      <div className="crumb">
        {crumbs.map((c, i) => (
          <span key={i} className={i === crumbs.length - 1 ? "" : "crumb-prefix"}>
            {i > 0 && <span className="crumb-prefix" style={{ margin: "0 6px", color: "var(--ink-300)" }}>/</span>}
            {i === crumbs.length - 1 ? <b>{c}</b> : <span>{c}</span>}
          </span>
        ))}
      </div>

      <button className="search" onClick={onSearch} style={{ cursor: "text", textAlign: "start" }} aria-label={t.search}>
        <span className="ico"><Icon name="search" size={14} /></span>
        <input placeholder={t.search} readOnly tabIndex={-1} style={{ cursor: "text", pointerEvents: "none" }} />
        <span className="kbd">⌘K</span>
      </button>

      {canInstall && (
        <button className="btn btn-secondary" onClick={onInstall} title={t.install}>
          <Icon name="download" size={14} /> {t.install}
        </button>
      )}

      {/* Notifications */}
      <div style={{ position: "relative" }}>
        <button className="icon-btn" onClick={() => setNotifOpen((o) => !o)} title={t.notifications} aria-label={t.notifications} aria-haspopup="true" aria-expanded={notifOpen}>
          <Icon name="bell" size={16} />
          {notifs.length > 0 && <span className="badge-dot">{notifs.length}</span>}
        </button>
        {notifOpen && (
          <div className="popover" style={{ top: "calc(100% + 8px)", insetInlineEnd: 0, minWidth: 300 }} onMouseLeave={() => setNotifOpen(false)}>
            <div className="pop-label">{t.notifications}</div>
            {notifs.length === 0 && <div className="empty" style={{ padding: "18px 10px" }}>{t.all_clear}</div>}
            {notifs.map((tk) => {
              const overdue = tk.status !== "done" && D.daysUntil(tk.due) < 0;
              return (
                <button key={tk.id} className="pop-item" style={{ flexDirection: "column", alignItems: "stretch", gap: 3 }} onClick={() => { onOpenTask?.(tk.id); setNotifOpen(false); }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }} dir="auto">
                    <Icon name={tk.status === "review" ? "bolt" : "clock"} size={13} style={{ color: overdue ? "var(--hue-urgent)" : "var(--hue-high)", flexShrink: 0 }} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{D.taskTitle(tk, lang)}</span>
                  </span>
                  <span className="muted" style={{ fontSize: 11 }}>
                    <span className="mono">{tk.id}</span> · {tk.status === "review" ? t.review_label : t.overdue} · {D.dueLabel(tk.due, lang)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Settings */}
      <div style={{ position: "relative" }}>
        <button className="icon-btn" onClick={() => setOpen((o) => !o)} title={t.settings} aria-label={t.settings} aria-haspopup="true" aria-expanded={open}>
          <Icon name="settings" size={16} />
        </button>
        {open && (
          <div className="popover" style={{ top: "calc(100% + 8px)", insetInlineEnd: 0 }} onMouseLeave={() => setOpen(false)}>
            <div className="pop-label">{t.language}</div>
            <button className={`pop-item ${lang === "en" ? "active" : ""}`} onClick={() => setSetting("lang", "en")}>
              <Icon name="globe" size={15} /> English
              {lang === "en" && <Icon name="check" size={14} className="chk" />}
            </button>
            <button className={`pop-item ${lang === "ar" ? "active" : ""}`} onClick={() => setSetting("lang", "ar")}>
              <Icon name="globe" size={15} /> العربية
              {lang === "ar" && <Icon name="check" size={14} className="chk" />}
            </button>
            <hr />
            <div className="pop-label">{t.theme}</div>
            <button className={`pop-item ${theme === "light" ? "active" : ""}`} onClick={() => setSetting("theme", "light")}>
              <Icon name="sparkle" size={15} /> {t.light}
              {theme === "light" && <Icon name="check" size={14} className="chk" />}
            </button>
            <button className={`pop-item ${theme === "dark" ? "active" : ""}`} onClick={() => setSetting("theme", "dark")}>
              <Icon name="bolt" size={15} /> {t.dark}
              {theme === "dark" && <Icon name="check" size={14} className="chk" />}
            </button>
            <hr />
            <div className="pop-label">{t.text_size}</div>
            <div className="seg-row" style={{ gap: 4 }}>
              {[{ id: "s", label: "S" }, { id: "m", label: "M" }, { id: "l", label: "L" }].map((sz) => (
                <button
                  key={sz.id}
                  className={`btn ${uiSize === sz.id ? "btn-primary" : "btn-secondary"}`}
                  style={{ flex: 1, justifyContent: "center", padding: "5px 0" }}
                  onClick={() => setSetting("uiSize", sz.id)}
                >
                  {sz.label}
                </button>
              ))}
            </div>
            <hr />
            <div className="pop-label">{t.accent}</div>
            <div className="seg-row">
              {Object.entries(ACCENT_SWATCH).map(([key, color]) => (
                <button
                  key={key}
                  className={`swatch-btn ${accent === key ? "active" : ""}`}
                  style={{ background: color }}
                  onClick={() => setSetting("accent", key)}
                  title={key}
                  aria-label={key}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {role === "manager" && !isMobile && (
        <button className="btn btn-primary" onClick={onNew}>
          <Icon name="plus" size={14} /> {t.new_task}
        </button>
      )}
    </div>
  );
}
