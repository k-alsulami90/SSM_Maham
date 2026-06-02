import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "./Icon.jsx";
import * as D from "../data/mock.js";
import { I18N } from "../data/i18n.js";
import { useStore } from "../store/AppStore.jsx";

/* ⌘K command palette — search tasks/people and jump to screens or create. */
export default function CommandPalette({ onClose, onOpenTask, onNav, onCreate }) {
  const { tasks, settings } = useStore();
  const { lang, role } = settings;
  const t = I18N[lang];
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const navTargets = useMemo(() => {
    const base = [
      { id: "dashboard", label: role === "manager" ? t.dashboard : t.my_tasks, icon: "dashboard" },
      { id: "hub", label: t.task_hub, icon: "hub" },
      { id: "recurring", label: t.recurring_duties, icon: "repeat" },
      { id: "register", label: t.asset_register, icon: "box" },
      { id: "vehicles", label: t.vehicles, icon: "car" },
      { id: "activity", label: t.activity, icon: "activity" },
    ];
    if (role === "manager") base.splice(2, 0, { id: "approvals", label: t.approvals, icon: "approve" }, { id: "assets", label: t.assets_dashboard, icon: "gauge" }, { id: "team", label: t.team, icon: "team" });
    else base.splice(2, 0, { id: "inbox", label: t.inbox, icon: "inbox" });
    return base;
  }, [role, t]);

  const query = q.trim().toLowerCase();
  const matchTask = (tk) =>
    !query ||
    tk.id.toLowerCase().includes(query) ||
    (tk.title || "").toLowerCase().includes(query) ||
    (tk.ar_title || "").includes(q.trim()) ||
    (tk.quotations || []).some((x) => (x.vendor || "").toLowerCase().includes(query));

  const taskResults = tasks.filter(matchTask).slice(0, 6);
  const peopleResults = D.getUsers().filter(
    (u) => !query || u.name.toLowerCase().includes(query) || u.ar.includes(q.trim())
  ).slice(0, query ? 4 : 0);
  const navResults = navTargets.filter((n) => !query || n.label.toLowerCase().includes(query));

  // Flatten into a single selectable list (same order as rendered below).
  const flat = useMemo(() => {
    const list = [];
    taskResults.forEach((tk) => list.push({ kind: "task", id: tk.id }));
    peopleResults.forEach((u) => list.push({ kind: "person", id: u.id }));
    navResults.forEach((n) => list.push({ kind: "nav", id: n.id }));
    list.push({ kind: "action", id: "create" });
    return list;
  }, [taskResults, peopleResults, navResults]);

  useEffect(() => { setActive(0); }, [q]);

  const run = (item) => {
    if (!item) return;
    if (item.kind === "task") onOpenTask(item.id);
    else if (item.kind === "nav") onNav(item.id);
    else if (item.kind === "person") onNav(role === "manager" ? "team" : "hub");
    else if (item.kind === "action") onCreate();
    onClose();
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, flat.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); run(flat[active]); }
    else if (e.key === "Escape") { e.preventDefault(); onClose(); }
  };

  let idx = -1;
  const Item = ({ item, children }) => {
    idx += 1;
    const i = idx;
    return (
      <button
        className={`cmdk-item ${i === active ? "active" : ""}`}
        onMouseEnter={() => setActive(i)}
        onClick={() => run(item)}
      >
        {children}
      </button>
    );
  };

  return (
    <div className="cmdk-mask" onClick={onClose}>
      <div className="cmdk" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={t.search}>
        <div className="cmdk-input">
          <Icon name="search" size={16} />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKeyDown} placeholder={t.cmd_hint} dir="auto" />
          <span className="kbd">esc</span>
        </div>
        <div className="cmdk-results">
          {flat.length === 0 && <div className="cmdk-empty">{t.no_results}</div>}

          {taskResults.length > 0 && (
            <>
              <div className="cmdk-group-label">{t.task_hub}</div>
              {taskResults.map((tk) => (
                <Item key={tk.id} item={{ kind: "task", id: tk.id }}>
                  <Icon name={D.TASK_TYPE_META[tk.type || "assignment"].icon} size={15} className="ic" />
                  <span dir="auto">{D.taskTitle(tk, lang)}</span>
                  <span className="sub">{tk.id}</span>
                </Item>
              ))}
            </>
          )}

          {peopleResults.length > 0 && (
            <>
              <div className="cmdk-group-label">{t.people}</div>
              {peopleResults.map((u) => (
                <Item key={u.id} item={{ kind: "person", id: u.id }}>
                  <Icon name="user" size={15} className="ic" />
                  <span dir="auto">{D.userName(u, lang)}</span>
                  <span className="sub">{u.role === "manager" ? t.role_manager : t.role_member}</span>
                </Item>
              ))}
            </>
          )}

          {navResults.length > 0 && (
            <>
              <div className="cmdk-group-label">{t.go_to}</div>
              {navResults.map((n) => (
                <Item key={n.id} item={{ kind: "nav", id: n.id }}>
                  <Icon name={n.icon} size={15} className="ic" />
                  <span>{n.label}</span>
                </Item>
              ))}
            </>
          )}

          <div className="cmdk-group-label">{t.quick_actions}</div>
          <Item item={{ kind: "action", id: "create" }}>
            <Icon name="plus" size={15} className="ic" />
            <span>{t.create_task}</span>
            <span className="sub">c</span>
          </Item>
        </div>
      </div>
    </div>
  );
}
