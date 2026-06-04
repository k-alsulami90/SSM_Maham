import { useEffect, useRef, useState } from "react";
import Icon from "./Icon.jsx";
import * as D from "../data/mock.js";
import { I18N } from "../data/i18n.js";

function ChipDropdown({ icon, label, value, active, options, onChange }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);
  const rtl = typeof document !== "undefined" && document.documentElement.dir === "rtl";

  // Fixed positioning so the menu isn't clipped by the scrollable modal body.
  // (Mobile turns .popover into a bottom sheet via !important, which still wins.)
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
      <button ref={btnRef} className={`chip ${active ? "active" : ""}`} onClick={toggle} type="button">
        <Icon name={icon} size={11} className="ico" />
        {value || label}
        <Icon name="chev_down" size={10} className="ico" />
      </button>
      {open && pos && (
        <div className="popover" style={{ position: "fixed", top: pos.top, [rtl ? "right" : "left"]: rtl ? pos.right : pos.left, minWidth: Math.max(160, pos.width) }} onMouseLeave={() => setOpen(false)}>
          {options.map((o) => (
            <button key={o.id} type="button" className="pop-item" onClick={() => { onChange(o.id); setOpen(false); }}>
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* Create modal — choose a task type (assignment / procurement / recurring),
   then type-specific fields. Recurring tasks become templates. */
export default function CreateTaskModal({ lang, onClose, onCreate, presetType = "assignment" }) {
  const t = I18N[lang];
  const [type, setType] = useState(presetType);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [priority, setPriority] = useState("med");
  const [project, setProject] = useState(() => D.getProjects()[0]?.id || "");
  const [assignee, setAssignee] = useState(() => (D.getUsers().find((u) => u.role === "member") || D.getUsers()[0])?.id || "");
  const [due, setDue] = useState("2026-06-05");
  const [freq, setFreq] = useState("daily");
  const [day, setDay] = useState("sun");
  const [dom, setDom] = useState(1);
  const titleRef = useRef(null);
  const modalRef = useRef(null);

  useEffect(() => { titleRef.current?.focus(); }, []);

  // Esc to close + focus trap within the dialog.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
      if (e.key !== "Tab" || !modalRef.current) return;
      const f = modalRef.current.querySelectorAll(
        'a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])'
      );
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = () => {
    onCreate({
      type,
      title: title.trim() || (lang === "ar" ? "مهمة جديدة" : "New task"),
      desc: desc.trim(),
      priority,
      project,
      assignee,
      due,
      recurrence:
        type === "recurring"
          ? { freq, ...(freq === "weekly" ? { day } : {}), ...(freq === "monthly" ? { dom: Number(dom) || 1 } : {}) }
          : undefined,
    });
  };

  const freqOptions = Object.keys(D.RECURRENCE_META).map((k) => ({ id: k, label: D.RECURRENCE_META[k][lang] }));
  const heading = type === "recurring" ? t.new_recurring : t.create_task;

  const TYPES = [
    { id: "assignment", icon: "tasks", label: t.type_assignment },
    { id: "procurement", icon: "quote", label: t.type_procurement },
    { id: "recurring", icon: "repeat", label: t.type_recurring },
  ];

  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal" ref={modalRef} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={heading}>
        <div className="modal-head">
          <span className="key">{type === "recurring" ? "R-NEW" : "T-NEW"}</span>
          <span className="h">{heading}</span>
          <button className="close icon-btn" onClick={onClose}><Icon name="x" size={14} /></button>
        </div>
        <div className="modal-body">
          {/* Type selector */}
          <div className="type-seg">
            {TYPES.map((ty) => (
              <button key={ty.id} type="button" className={`type-opt ${type === ty.id ? "active" : ""}`} onClick={() => setType(ty.id)}>
                <Icon name={ty.icon} size={13} /> {ty.label}
              </button>
            ))}
          </div>

          <input
            ref={titleRef}
            className="title-input"
            dir="auto"
            placeholder={t.title_placeholder}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit(); }}
          />
          <textarea className="desc-input" dir="auto" placeholder={t.desc_placeholder} rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} />
          <hr className="hr" />
          <div className="chip-row">
            <ChipDropdown icon="flag" label={t.priority} value={D.priorityLabel(priority, lang)} active options={Object.keys(D.PRIORITY_META).map((k) => ({ id: k, label: D.priorityLabel(k, lang) }))} onChange={setPriority} />
            <ChipDropdown icon="layers" label={t.project} value={D.projectName(D.findProject(project), lang)} active options={D.getProjects().map((p) => ({ id: p.id, label: D.projectName(p, lang) }))} onChange={setProject} />
            <ChipDropdown icon="user" label={t.assignee} value={D.userName(D.findUser(assignee), lang)} active options={D.getUsers().filter((u) => u.role === "member").map((u) => ({ id: u.id, label: D.userName(u, lang) }))} onChange={setAssignee} />
            {type === "recurring" ? (
              <>
                <ChipDropdown icon="repeat" label={t.repeats} value={D.RECURRENCE_META[freq][lang]} active options={freqOptions} onChange={setFreq} />
                {freq === "weekly" && (
                  <label className="chip active" style={{ gap: 6 }}>
                    <Icon name="calendar" size={11} className="ico" /> {t.on_day}
                    <select value={day} onChange={(e) => setDay(e.target.value)} style={{ border: 0, background: "transparent", outline: "none", color: "inherit", font: "inherit" }}>
                      {["sun", "mon", "tue", "wed", "thu", "fri", "sat"].map((d) => <option key={d} value={d}>{t.weekdays[d]}</option>)}
                    </select>
                  </label>
                )}
                {freq === "monthly" && (
                  <label className="chip active" style={{ gap: 6 }}>
                    <Icon name="calendar" size={11} className="ico" /> {t.day_of_month}
                    <input type="number" min="1" max="31" value={dom} onChange={(e) => setDom(e.target.value)} style={{ width: 44, border: 0, background: "transparent", outline: "none", color: "inherit", font: "inherit" }} />
                  </label>
                )}
              </>
            ) : (
              <label className="chip active" style={{ gap: 6 }}>
                <Icon name="calendar" size={11} className="ico" /> {t.due}
                <input type="date" value={due} onChange={(e) => setDue(e.target.value)} style={{ border: 0, background: "transparent", outline: "none", color: "inherit", font: "inherit" }} />
              </label>
            )}
          </div>
          {type === "procurement" && (
            <div className="muted" style={{ fontSize: 11.5, display: "inline-flex", alignItems: "center", gap: 5 }}>
              <Icon name="quote" size={12} /> {lang === "ar" ? "سيجمع المُسنَد إليه عروض الأسعار ثم ترفعها للاختيار." : "The assignee will gather quotations, then submit them for your selection."}
            </div>
          )}
        </div>
        <div className="modal-foot">
          <span className="hint"><Icon name="bolt" size={11} /> {t.enter_hint}</span>
          <div className="right">
            <button className="btn btn-ghost" onClick={onClose}>{t.cancel}</button>
            <button className="btn btn-primary" onClick={submit}>
              {t.create}
              <span className="muted mono" style={{ marginInlineStart: 6, fontSize: 11, color: "rgba(253,248,236,0.6)" }}>⌘↵</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
