import { useEffect, useRef, useState } from "react";
import Icon from "./Icon.jsx";
import * as D from "../data/mock.js";
import { I18N } from "../data/i18n.js";

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
  const [due, setDue] = useState(() => { const d = new Date(D.TODAY); d.setDate(d.getDate() + 3); return d.toISOString().slice(0, 10); });
  const [freq, setFreq] = useState("daily");
  const [day, setDay] = useState("sun");
  const [dom, setDom] = useState(1);
  const [submitting, setSubmitting] = useState(false);
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
    if (submitting) return;
    setSubmitting(true);
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
          {/* Clean labeled selects (native, open adjacent — no floating popovers) */}
          <div className="qf-row">
            <label className="qf-cell"><span className="qf-label">{t.priority}</span>
              <select className="qf" value={priority} onChange={(e) => setPriority(e.target.value)}>
                {Object.keys(D.PRIORITY_META).map((k) => <option key={k} value={k}>{D.priorityLabel(k, lang)}</option>)}
              </select>
            </label>
            <label className="qf-cell"><span className="qf-label">{t.project}</span>
              <select className="qf" value={project} onChange={(e) => setProject(e.target.value)}>
                {D.getProjects().map((p) => <option key={p.id} value={p.id}>{D.projectName(p, lang)}</option>)}
              </select>
            </label>
          </div>
          <div className="qf-row">
            <label className="qf-cell"><span className="qf-label">{t.assignee}</span>
              <select className="qf" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                {D.getUsers().filter((u) => u.role === "member").map((u) => <option key={u.id} value={u.id}>{D.userName(u, lang)}</option>)}
              </select>
            </label>
            {type === "recurring" ? (
              <label className="qf-cell"><span className="qf-label">{t.repeats}</span>
                <select className="qf" value={freq} onChange={(e) => setFreq(e.target.value)}>{freqOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select>
              </label>
            ) : (
              <label className="qf-cell"><span className="qf-label">{t.due}</span><input type="date" className="qf" value={due} onChange={(e) => setDue(e.target.value)} /></label>
            )}
          </div>
          {type === "recurring" && freq === "weekly" && (
            <label className="qf-cell"><span className="qf-label">{t.on_day}</span>
              <select className="qf" value={day} onChange={(e) => setDay(e.target.value)}>{["sun", "mon", "tue", "wed", "thu", "fri", "sat"].map((d) => <option key={d} value={d}>{t.weekdays[d]}</option>)}</select>
            </label>
          )}
          {type === "recurring" && freq === "monthly" && (
            <label className="qf-cell"><span className="qf-label">{t.day_of_month}</span><input type="number" min="1" max="31" className="qf" value={dom} onChange={(e) => setDom(e.target.value)} /></label>
          )}
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
