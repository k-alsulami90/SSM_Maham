import { useState } from "react";
import Icon from "./Icon.jsx";
import Avatar from "./Avatar.jsx";
import { PriorityTag, ProjectTag, StatusPill } from "./Tags.jsx";
import * as D from "../data/mock.js";
import { I18N } from "../data/i18n.js";

const STATUS_ORDER = { backlog: 0, progress: 1, review: 2, done: 3 };
const PRIORITY_ORDER = { urgent: 0, high: 1, med: 2, low: 3 };

/* Tasks list with click-to-sort columns. */
export default function ListView({ tasks, lang, onOpen, selectedId }) {
  const t = I18N[lang];
  const [sort, setSort] = useState({ key: "due", dir: "asc" });

  const toggle = (key) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));

  const cmp = (a, b) => {
    switch (sort.key) {
      case "title": return D.taskTitle(a, lang).localeCompare(D.taskTitle(b, lang), lang);
      case "assignee": return D.userName(D.findUser(a.assignee), lang).localeCompare(D.userName(D.findUser(b.assignee), lang), lang);
      case "status": return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      case "priority": return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      case "due":
      default: return new Date(a.due) - new Date(b.due);
    }
  };
  const sorted = [...tasks].sort((a, b) => (sort.dir === "asc" ? 1 : -1) * cmp(a, b));

  const Head = ({ k, children, style }) => (
    <button
      className="sort-head"
      style={style}
      onClick={() => toggle(k)}
      aria-label={`Sort by ${typeof children === "string" ? children : k}`}
    >
      {children}
      <Icon name={sort.key === k ? (sort.dir === "asc" ? "chev_up" : "chev_down") : "chev_down"} size={11} style={{ opacity: sort.key === k ? 1 : 0.25 }} />
    </button>
  );

  if (sorted.length === 0) {
    return <div className="list-wrap"><div className="empty">{t.no_tasks}</div></div>;
  }

  return (
    <div className="list-wrap">
      <div className="list-row header">
        <span></span>
        <Head k="title">{lang === "ar" ? "المهمة" : "Task"}</Head>
        <Head k="assignee">{t.assignee}</Head>
        <Head k="due">{t.due}</Head>
        <Head k="status">{t.filter_status}</Head>
        <span></span>
      </div>
      {sorted.map((tk) => {
        const u = D.findUser(tk.assignee);
        const days = D.daysUntil(tk.due);
        const overdue = tk.status !== "done" && days < 0;
        const done = tk.status === "done";
        return (
          <div
            key={tk.id}
            className={`list-row ${selectedId === tk.id ? "selected" : ""}`}
            onClick={() => onOpen(tk.id)}
          >
            <div className={`check ${done ? "done" : ""}`}>
              {done && <Icon name="check" size={10} strokeWidth={2.5} />}
            </div>
            <div className="ttl">
              <span className="mono" style={{ color: "var(--ink-300)", fontSize: 11, marginInlineEnd: 8 }}>{tk.id}</span>
              {D.taskTitle(tk, lang)}
              <span style={{ marginInlineStart: 8 }}><PriorityTag p={tk.priority} lang={lang} /></span>
              <span style={{ marginInlineStart: 4 }}><ProjectTag projectId={tk.project} lang={lang} /></span>
            </div>
            <div className="who">
              <Avatar user={u} size={20} />
              <span style={{ fontSize: 12.5 }}>{D.userName(u, lang).split(" ")[0]}</span>
            </div>
            <div className={`due ${overdue ? "overdue" : ""}`}>{D.dueLabel(tk.due, lang)}</div>
            <div><StatusPill status={tk.status} lang={lang} /></div>
            <Icon name="more" size={14} className="dots" />
          </div>
        );
      })}
    </div>
  );
}
