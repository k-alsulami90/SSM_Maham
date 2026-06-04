import { useEffect, useRef, useState } from "react";
import Icon from "./Icon.jsx";
import * as D from "../data/mock.js";
import { I18N } from "../data/i18n.js";

function FilterPill({ icon, label, value, options, getLabel, onChange }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);
  const rtl = typeof document !== "undefined" && document.documentElement.dir === "rtl";
  const selected = value ? options.find((o) => o.id === value) : null;

  // Fixed positioning so the menu escapes the scrollable content container.
  const toggle = () => {
    if (open) return setOpen(false);
    const r = btnRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 6, left: r.left, right: window.innerWidth - r.right, width: r.width });
    setOpen(true);
  };
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => { window.removeEventListener("scroll", close, true); window.removeEventListener("resize", close); };
  }, [open]);

  return (
    <div style={{ position: "relative" }}>
      <button ref={btnRef} className="filter-pill" onClick={toggle} type="button">
        <Icon name={icon} size={11} />
        {selected ? <b style={{ fontWeight: 600 }}>{getLabel(selected)}</b> : label}
        {selected ? (
          <span
            className="x"
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
          >
            <Icon name="x" size={10} />
          </span>
        ) : (
          <Icon name="chev_down" size={10} />
        )}
      </button>
      {open && pos && (
        <div className="popover" style={{ position: "fixed", top: pos.top, [rtl ? "right" : "left"]: rtl ? pos.right : pos.left, minWidth: Math.max(180, pos.width) }} onMouseLeave={() => setOpen(false)}>
          {options.map((o) => (
            <button
              key={o.id}
              type="button"
              className={`pop-item ${value === o.id ? "active" : ""}`}
              onClick={() => {
                onChange(o.id);
                setOpen(false);
              }}
            >
              {getLabel(o)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* View switch + project / assignee / priority filters. */
export default function FilterBar({ lang, view, setView, filters, setFilters }) {
  const t = I18N[lang];
  const setFilter = (k, v) => setFilters({ ...filters, [k]: v });
  return (
    <div className="filters">
      <div className="tabbar">
        <button className={view === "kanban" ? "active" : ""} onClick={() => setView("kanban")}>
          <Icon name="kanban" size={11} style={{ marginInlineEnd: 4 }} /> {t.kanban_view}
        </button>
        <button className={view === "list" ? "active" : ""} onClick={() => setView("list")}>
          <Icon name="list" size={11} style={{ marginInlineEnd: 4 }} /> {t.list_view}
        </button>
      </div>
      <div className="divider-v" />
      <FilterPill
        icon="layers"
        label={t.filter_project}
        value={filters.project}
        options={D.getProjects()}
        getLabel={(p) => D.projectName(p, lang)}
        onChange={(v) => setFilter("project", v)}
      />
      <FilterPill
        icon="user"
        label={t.assignee}
        value={filters.assignee}
        options={D.getUsers().filter((u) => u.role === "member")}
        getLabel={(u) => D.userName(u, lang)}
        onChange={(v) => setFilter("assignee", v)}
      />
      <FilterPill
        icon="flag"
        label={t.priority}
        value={filters.priority}
        options={Object.keys(D.PRIORITY_META).map((k) => ({ id: k }))}
        getLabel={(p) => D.priorityLabel(p.id, lang)}
        onChange={(v) => setFilter("priority", v)}
      />
      <div style={{ marginInlineStart: "auto", display: "flex", gap: 6, alignItems: "center", fontSize: 12, color: "var(--ink-400)" }}>
        {t.sort}: <b style={{ color: "var(--ink-700)", fontWeight: 600 }}>{t.due_date}</b>
      </div>
    </div>
  );
}
