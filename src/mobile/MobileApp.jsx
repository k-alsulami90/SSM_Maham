import { useState } from "react";
import Icon from "../components/Icon.jsx";
import Avatar from "../components/Avatar.jsx";
import { PriorityTag } from "../components/Tags.jsx";
import * as D from "../data/mock.js";
import { I18N, ACCENT_SWATCH } from "../data/i18n.js";
import { useStore } from "../store/AppStore.jsx";
import { useTaskActions } from "../store/useTaskActions.js";

/* ===== Manager home ===== */
function ManagerHome({ lang, tasks, currentUser, onOpen, act }) {
  const t = I18N[lang];
  const review = tasks.filter((x) => x.status === "review");
  const active = tasks.filter((x) => x.status !== "done").length;
  const overdue = tasks.filter((x) => x.status !== "done" && D.daysUntil(x.due) < 0).length;
  const members = D.getUsers().filter((u) => u.role === "member");

  return (
    <>
      <div className="mob-head">
        <div className="greet">
          <div className="hi">{t.morning},</div>
          <div className="name">{D.userName(currentUser, lang).split(" ")[0]}</div>
        </div>
        <div className="av">{currentUser.initials}</div>
      </div>

      <div className="mob-stats">
        <div className="s"><div className="v">{active}</div><div className="l">{t.metric_active}</div></div>
        <div className="s"><div className="v" style={{ color: "var(--hue-high)" }}>{review.length}</div><div className="l">{t.metric_review}</div></div>
        <div className="s"><div className="v" style={{ color: overdue > 0 ? "var(--hue-urgent)" : "var(--ink-900)" }}>{overdue}</div><div className="l">{t.metric_overdue}</div></div>
      </div>

      <div className="mob-section-h">{t.approvals_title}</div>
      <div style={{ padding: "0 14px 8px", display: "flex", flexDirection: "column", gap: 8 }}>
        {review.slice(0, 4).map((tk) => {
          const u = D.findUser(tk.assignee);
          return (
            <div key={tk.id} style={{ background: "var(--bg-elev)", border: "1px solid var(--line)", borderRadius: "var(--r)", padding: "12px 14px" }} onClick={() => onOpen(tk.id)}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <span className="tag priority-high" style={{ fontSize: 10.5 }}><span className="dot" />{t.for_review}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--ink-400)", marginInlineStart: "auto" }}>{tk.id}</span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.3, marginBottom: 8, textWrap: "pretty" }}>{D.taskTitle(tk, lang)}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Avatar user={u} size={20} />
                <span style={{ fontSize: 12, color: "var(--ink-500)" }}>{D.userName(u, lang)}</span>
                <div style={{ marginInlineStart: "auto", display: "flex", gap: 6 }} onClick={(e) => e.stopPropagation()}>
                  {tk.type === "procurement" && !tk.selectedQuotationId ? (
                    <button style={{ padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, background: "var(--acc-forest)", color: "#fdf8ec" }} onClick={() => onOpen(tk.id)}>
                      {t.review_quotations}
                    </button>
                  ) : (
                    <>
                      <button style={{ padding: "6px 10px", borderRadius: 6, fontSize: 12, fontWeight: 500, background: "var(--bg-sand)", color: "var(--ink-700)" }} onClick={() => act(tk, "progress", "rejected")}>{t.reject}</button>
                      <button style={{ padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, background: "var(--acc-forest)", color: "#fdf8ec" }} onClick={() => act(tk, "done")}>{t.approve}</button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {review.length === 0 && <div className="empty">{t.nothing_review}</div>}
      </div>

      <div className="mob-section-h">{t.workload_title}</div>
      <div style={{ padding: "0 14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {members.map((u) => {
          const total = tasks.filter((tk) => tk.assignee === u.id && tk.status !== "done").length;
          const pct = Math.min(100, total * 20);
          return (
            <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Avatar user={u} size={26} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{D.userName(u, lang)}</div>
                <div style={{ height: 5, background: "var(--bg-sand)", borderRadius: 3, marginTop: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: "var(--acc-forest)", borderRadius: 3 }} />
                </div>
              </div>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-500)" }}>{total}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ===== Member home ===== */
function MemberHome({ lang, tasks, currentUser, onOpen, act }) {
  const t = I18N[lang];
  const mine = tasks.filter((x) => x.assignee === currentUser.id);
  const today = mine.filter((x) => x.status === "progress" || x.status === "backlog");
  const review = mine.filter((x) => x.status === "review");

  return (
    <>
      <div className="mob-head">
        <div className="greet">
          <div className="hi">{t.today_focus}</div>
          <div className="name">{today.length} {lang === "ar" ? "مهام" : "tasks"}</div>
        </div>
        <div className="av">{currentUser.initials}</div>
      </div>

      <div style={{ padding: "4px 14px 6px" }}>
        <div style={{ background: "linear-gradient(135deg, var(--acc-moss-bg), oklch(0.96 0.025 100))", border: "1px solid oklch(0.85 0.05 145)", borderRadius: "var(--r-lg)", padding: "14px 16px", display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: "var(--acc-forest)", color: "#fdf8ec", display: "grid", placeItems: "center", flexShrink: 0 }}><Icon name="flame" size={18} /></div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--acc-forest)" }}>{t.most_urgent}</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2, lineHeight: 1.3, textWrap: "pretty" }}>{today[0] ? D.taskTitle(today[0], lang) : "—"}</div>
            <div style={{ fontSize: 11.5, color: "var(--ink-500)", marginTop: 4, fontFamily: "var(--font-mono)" }}>{today[0] && D.dueLabel(today[0].due, lang)}</div>
          </div>
        </div>
      </div>

      <div className="mob-section-h">{t.in_progress}<button className="more">{today.length}</button></div>
      {today.map((tk) => {
        const overdue = D.daysUntil(tk.due) < 0;
        return (
          <div className="mob-task" key={tk.id} onClick={() => onOpen(tk.id)}>
            <div className="row">
              <span className={`tag priority-${tk.priority}`} style={{ fontSize: 10.5 }}><span className="dot" />{D.priorityLabel(tk.priority, lang)}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--ink-400)", marginInlineStart: "auto" }}>{tk.id}</span>
            </div>
            <div className="ttl">{D.taskTitle(tk, lang)}</div>
            <div className="progressbar"><div className="fill" style={{ width: `${tk.progress}%` }} /></div>
            <div className="foot">
              <span className="due" style={overdue ? { color: "var(--hue-urgent)" } : null}>
                <Icon name="calendar" size={11} style={{ verticalAlign: -1 }} /> {D.dueLabel(tk.due, lang)}
              </span>
              <span>·</span>
              <span style={{ fontFamily: "var(--font-mono)" }}>{tk.progress}%</span>
              <button
                style={{ marginInlineStart: "auto", padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 500, background: tk.status === "progress" ? "var(--acc-forest)" : "var(--bg-sand)", color: tk.status === "progress" ? "#fdf8ec" : "var(--ink-700)" }}
                onClick={(e) => {
                  e.stopPropagation();
                  act(tk, tk.status === "progress" ? "review" : "progress");
                }}
              >
                {tk.status === "progress" ? t.submit_for_review : t.move_to_progress}
              </button>
            </div>
          </div>
        );
      })}
      {today.length === 0 && <div className="empty">{t.no_tasks}</div>}

      {review.length > 0 && (
        <>
          <div className="mob-section-h">{t.review_label}<button className="more">{review.length}</button></div>
          {review.map((tk) => (
            <div className="mob-task" key={tk.id} style={{ background: "var(--bg-tinted)" }} onClick={() => onOpen(tk.id)}>
              <div className="row">
                <span className="tag priority-high" style={{ fontSize: 10.5 }}><Icon name="clock" size={9} /> {t.awaiting_manager}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--ink-400)", marginInlineStart: "auto" }}>{tk.id}</span>
              </div>
              <div className="ttl" style={{ color: "var(--ink-700)" }}>{D.taskTitle(tk, lang)}</div>
            </div>
          ))}
        </>
      )}
      <div style={{ height: 12 }} />
    </>
  );
}

/* ===== Mobile task list (hub / inbox) ===== */
function MobileList({ lang, items, onOpen, title }) {
  const t = I18N[lang];
  return (
    <>
      <div className="mob-head">
        <div className="greet"><div className="name" style={{ fontSize: 20 }}>{title}</div></div>
      </div>
      <div className="mob-section-h">{items.length} {lang === "ar" ? "مهمة" : "tasks"}</div>
      {items.map((tk) => {
        const overdue = tk.status !== "done" && D.daysUntil(tk.due) < 0;
        return (
          <div className="mob-task" key={tk.id} onClick={() => onOpen(tk.id)}>
            <div className="row">
              <span className={`tag priority-${tk.priority}`} style={{ fontSize: 10.5 }}><span className="dot" />{D.priorityLabel(tk.priority, lang)}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--ink-400)", marginInlineStart: "auto" }}>{tk.id}</span>
            </div>
            <div className="ttl">{D.taskTitle(tk, lang)}</div>
            <div className="foot">
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 7, height: 7, borderRadius: 2, background: D.STATUS_META[tk.status].dot }} />
                {D.statusLabel(tk.status, lang)}
              </span>
              <span className="due" style={overdue ? { color: "var(--hue-urgent)", marginInlineStart: "auto" } : { marginInlineStart: "auto" }}>{D.dueLabel(tk.due, lang)}</span>
            </div>
          </div>
        );
      })}
      {items.length === 0 && <div className="empty">{t.no_tasks}</div>}
    </>
  );
}

/* ===== Settings ("Me") ===== */
function MobileMe({ lang, currentUser }) {
  const { settings, dispatch } = useStore();
  const t = I18N[lang];
  const set = (k, v) => dispatch({ type: "SET_SETTING", key: k, value: v });
  return (
    <>
      <div className="mob-head">
        <div className="greet"><div className="name" style={{ fontSize: 20 }}>{t.me}</div></div>
      </div>
      <div style={{ padding: "8px 14px", display: "flex", alignItems: "center", gap: 12 }}>
        <Avatar user={currentUser} size={44} />
        <div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{D.userName(currentUser, lang)}</div>
          <div style={{ fontSize: 12, color: "var(--ink-500)" }}>{settings.role === "manager" ? t.role_manager : t.role_member}</div>
        </div>
      </div>

      <div className="mob-section-h">{t.switch_role}</div>
      <div style={{ padding: "0 14px", display: "flex", gap: 8 }}>
        {["manager", "member"].map((r) => (
          <button
            key={r}
            className={`btn ${settings.role === r ? "btn-primary" : "btn-secondary"}`}
            style={{ flex: 1, justifyContent: "center" }}
            onClick={() => set("role", r)}
          >
            {r === "manager" ? t.role_manager : t.role_member}
          </button>
        ))}
      </div>

      <div className="mob-section-h">{t.language}</div>
      <div style={{ padding: "0 14px", display: "flex", gap: 8 }}>
        {[{ id: "en", label: "English" }, { id: "ar", label: "العربية" }].map((l) => (
          <button key={l.id} className={`btn ${settings.lang === l.id ? "btn-primary" : "btn-secondary"}`} style={{ flex: 1, justifyContent: "center" }} onClick={() => set("lang", l.id)}>
            {l.label}
          </button>
        ))}
      </div>

      <div className="mob-section-h">{t.theme}</div>
      <div style={{ padding: "0 14px", display: "flex", gap: 8 }}>
        {[{ id: "light", label: t.light }, { id: "dark", label: t.dark }].map((th) => (
          <button key={th.id} className={`btn ${settings.theme === th.id ? "btn-primary" : "btn-secondary"}`} style={{ flex: 1, justifyContent: "center" }} onClick={() => set("theme", th.id)}>
            {th.label}
          </button>
        ))}
      </div>

      <div className="mob-section-h">{t.text_size}</div>
      <div style={{ padding: "0 14px", display: "flex", gap: 8 }}>
        {[{ id: "s", label: "S" }, { id: "m", label: "M" }, { id: "l", label: "L" }].map((sz) => (
          <button key={sz.id} className={`btn ${settings.uiSize === sz.id ? "btn-primary" : "btn-secondary"}`} style={{ flex: 1, justifyContent: "center" }} onClick={() => set("uiSize", sz.id)}>
            {sz.label}
          </button>
        ))}
      </div>

      <div className="mob-section-h">{t.accent}</div>
      <div style={{ padding: "0 14px 16px", display: "flex", gap: 12 }}>
        {Object.entries(ACCENT_SWATCH).map(([key, color]) => (
          <button key={key} className={`swatch-btn ${settings.accent === key ? "active" : ""}`} style={{ background: color, width: 32, height: 32 }} onClick={() => set("accent", key)} aria-label={key} />
        ))}
      </div>

      <div style={{ padding: "0 14px" }}>
        <button className="btn btn-secondary" style={{ width: "100%", justifyContent: "center" }} onClick={() => dispatch({ type: "RESET" })}>
          {lang === "ar" ? "إعادة ضبط البيانات" : "Reset demo data"}
        </button>
      </div>
      <div style={{ height: 12 }} />
    </>
  );
}

/* ===== Mobile shell with bottom tab bar ===== */
export default function MobileApp({ onOpen, onCreate }) {
  const { tasks, settings } = useStore();
  const taskActions = useTaskActions();
  const { lang, role, currentUserId } = settings;
  const t = I18N[lang];
  const currentUser = D.findUser(currentUserId);
  const [tab, setTab] = useState("home");

  const act = (task, status, logKey) => {
    if (logKey === "rejected") taskActions.reject(task, "");
    else if (status === "done") taskActions.approve(task);
    else if (status === "review") taskActions.submit(task);
    else if (status === "progress") taskActions.start(task);
    else taskActions.setStatus(task, status, { logKey });
  };

  const mine = tasks.filter((x) => x.assignee === currentUserId);
  const hubItems = role === "member" ? mine : tasks;
  const inboxItems = role === "member" ? mine.filter((x) => x.status !== "done") : tasks.filter((x) => x.status === "review");

  let body;
  if (tab === "home") {
    body = role === "manager"
      ? <ManagerHome lang={lang} tasks={tasks} currentUser={currentUser} onOpen={onOpen} act={act} />
      : <MemberHome lang={lang} tasks={tasks} currentUser={currentUser} onOpen={onOpen} act={act} />;
  } else if (tab === "hub") {
    body = <MobileList lang={lang} items={hubItems} onOpen={onOpen} title={t.task_hub} />;
  } else if (tab === "inbox") {
    body = <MobileList lang={lang} items={inboxItems} onOpen={onOpen} title={role === "manager" ? t.approvals : t.inbox} />;
  } else {
    body = <MobileMe lang={lang} currentUser={currentUser} />;
  }

  const Tab = ({ id, icon, label }) => (
    <button className={`t ${tab === id ? "active" : ""}`} onClick={() => setTab(id)}>
      <Icon name={icon} size={20} />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="mob" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div style={{ flex: 1, overflowY: "auto" }}>{body}</div>
      <div className="mob-tabbar">
        <Tab id="home" icon="home" label={t.home} />
        <Tab id="hub" icon="hub" label={t.task_hub} />
        <button className="t fab" onClick={onCreate} aria-label={t.new_task}><Icon name="plus" size={22} strokeWidth={2.5} /></button>
        <Tab id="inbox" icon="inbox" label={role === "manager" ? t.approvals : t.inbox} />
        <Tab id="me" icon="user" label={t.me} />
      </div>
    </div>
  );
}
