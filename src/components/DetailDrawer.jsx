import { useEffect, useState } from "react";
import Icon from "./Icon.jsx";
import Avatar from "./Avatar.jsx";
import { PriorityTag } from "./Tags.jsx";
import DocumentsSection from "./DocumentsSection.jsx";
import QuotationsSection from "./QuotationsSection.jsx";
import Disclosure from "./Disclosure.jsx";
import * as D from "../data/mock.js";
import { I18N } from "../data/i18n.js";
import { useStore } from "../store/AppStore.jsx";
import { useTaskActions } from "../store/useTaskActions.js";

/* Task detail drawer — fields, type-aware actions, quotations/docs,
   subtasks, activity + composer. Reads the live task from the store. */
export default function DetailDrawer({ taskId, lang, onClose }) {
  const { tasks, templates, settings, dispatch } = useStore();
  const actions = useTaskActions();
  const t = I18N[lang];
  const [comment, setComment] = useState("");
  const [newSub, setNewSub] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [costEdit, setCostEdit] = useState(null);
  const [descEdit, setDescEdit] = useState(null);

  // Esc closes the drawer.
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const task = tasks.find((x) => x.id === taskId);
  if (!task) return null;

  const role = settings.role;
  const me = settings.currentUserId;
  const u = D.findUser(task.assignee);
  const p = D.findProject(task.project);
  const type = task.type || "assignment";
  const typeMeta = D.TASK_TYPE_META[type];
  const template = type === "recurring" ? templates.find((x) => x.id === task.templateId) : null;

  const sendComment = () => {
    const text = comment.trim();
    if (!text) return;
    dispatch({ type: "ADD_COMMENT", id: task.id, text, actorId: me });
    setComment("");
  };
  const addSubtask = () => {
    const text = newSub.trim();
    if (!text) return;
    dispatch({ type: "ADD_SUBTASK", id: task.id, text });
    setNewSub("");
  };

  const isOwner = task.assignee === me;
  const hasPick = !!task.selectedQuotationId;
  const overdue = task.status !== "done" && D.daysUntil(task.due) < 0;
  const canEditCost = role === "manager" || task.assignee === me;
  const acts = task.activity || [];
  const msgs = acts.filter((a) => a.kind !== "system");   // people's comments
  const sysLog = acts.filter((a) => a.kind === "system");  // system events

  // ===== Type-aware action bar =====
  const memberActions = () => {
    if (role !== "member" || !isOwner || task.status === "done") return null;
    if (type === "recurring")
      return <button className="btn btn-primary" onClick={() => actions.markDone(task)}><Icon name="check" size={12} /> {t.mark_done}</button>;
    if (type === "procurement") {
      if (task.status === "backlog")
        return <button className="btn btn-secondary" onClick={() => actions.start(task)}><Icon name="play" size={12} /> {t.collect_quotations}</button>;
      if (task.status === "progress")
        return (
          <button className="btn btn-primary" onClick={() => actions.submit(task)}>
            <Icon name="send" size={12} /> {hasPick ? t.submit_completion : t.submit_quotations}
          </button>
        );
      if (task.status === "review")
        return (
          <button className="btn btn-secondary" disabled style={{ opacity: 0.7 }}>
            <Icon name="clock" size={12} /> {hasPick ? t.awaiting_review : t.awaiting_selection}
          </button>
        );
      return null;
    }
    // assignment
    if (task.status === "backlog")
      return <button className="btn btn-secondary" onClick={() => actions.start(task)}><Icon name="play" size={12} /> {t.move_to_progress}</button>;
    if (task.status === "progress")
      return <button className="btn btn-primary" onClick={() => actions.submit(task)}><Icon name="send" size={12} /> {t.submit_for_review}</button>;
    if (task.status === "review")
      return <button className="btn btn-secondary" disabled style={{ opacity: 0.7 }}><Icon name="clock" size={12} /> {t.awaiting_review}</button>;
    return null;
  };

  const managerActions = () => {
    if (role !== "manager" || task.status !== "review") return null;
    // Procurement awaiting selection → the choice happens in the quotation table.
    if (type === "procurement" && !hasPick) {
      return (
        <div className="callout" style={{ fontSize: 12.5, padding: "8px 12px" }}>
          <Icon name="quote" size={14} /> {t.select_quotation}
        </div>
      );
    }
    if (rejecting) {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
          <textarea
            autoFocus
            dir="auto"
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t.reject_reason_ph}
            style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "8px 10px", fontSize: 13, background: "var(--bg-elev)", resize: "none" }}
          />
          <div style={{ display: "flex", gap: 6 }}>
            <button className="btn btn-danger" onClick={() => { actions.reject(task, reason); setRejecting(false); setReason(""); }}>
              <Icon name="reject" size={12} /> {t.request_changes}
            </button>
            <button className="btn btn-ghost" onClick={() => { setRejecting(false); setReason(""); }}>{t.cancel}</button>
          </div>
        </div>
      );
    }
    return (
      <div style={{ display: "flex", gap: 6 }}>
        <button className="btn btn-primary" onClick={() => actions.approve(task)}><Icon name="check" size={12} /> {t.approve}</button>
        <button className="btn btn-danger" onClick={() => setRejecting(true)}><Icon name="reject" size={12} /> {t.reject}</button>
      </div>
    );
  };

  const mAct = memberActions();
  const mgrAct = managerActions();

  return (
    <aside className="drawer" role="dialog" aria-label={D.taskTitle(task, lang)}>
      <div className="drawer-head">
        <div style={{ minWidth: 0 }}>
          <span className="key">
            {task.id} · {D.projectName(p, lang)}
            <span className="type-badge" style={{ marginInlineStart: 8 }}>
              <Icon name={typeMeta.icon} size={10} /> {typeMeta[lang]}
            </span>
          </span>
          <div className="tt">{D.taskTitle(task, lang)}</div>
        </div>
        <button className="close icon-btn" onClick={onClose} aria-label={t.cancel}><Icon name="x" size={14} /></button>
      </div>

      <div className="drawer-body">
        {/* Hero: current status (context) */}
        <div className="task-hero">
          <span className="task-status">
            <span className="dot" style={{ background: D.STATUS_META[task.status].dot }} />
            {D.statusLabel(task.status, lang)}
          </span>
        </div>

        {/* The next action is the focal point */}
        {(mAct || mgrAct) && <div className="task-actions">{mAct}{mgrAct}</div>}

        {/* One-line facts: assignee · due · priority · cost · repeats */}
        <div className="task-line">
          <span className="who-inline">
            <Avatar user={u} size={16} />
            {role === "manager" ? (
              <select className="fact-select" aria-label={t.assignee} value={task.assignee || ""} onChange={(e) => dispatch({ type: "UPDATE_TASK", id: task.id, patch: { assignee: e.target.value } })}>
                <option value="">—</option>
                {D.getUsers().map((x) => <option key={x.id} value={x.id}>{D.userName(x, lang)}</option>)}
              </select>
            ) : D.userName(u, lang)}
          </span>
          <span className="sep">·</span>
          <span className={overdue ? "fact-urgent" : ""}>{D.dueLabel(task.due, lang)}</span>
          <span className="sep">·</span>
          <span>{D.priorityLabel(task.priority, lang)}</span>
          <span className="sep">·</span>
          <span>
            {costEdit !== null ? (
              <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
                <input type="number" autoFocus value={costEdit} onChange={(e) => setCostEdit(e.target.value)} style={{ width: 78, padding: "2px 6px", border: "1px solid var(--line)", borderRadius: 6, background: "var(--bg-elev)" }} />
                <span className="muted">SAR</span>
                <button className="btn btn-primary" style={{ padding: "2px 7px", fontSize: 12 }} onClick={() => { dispatch({ type: "UPDATE_TASK", id: task.id, patch: { cost: Number(costEdit) || 0 } }); setCostEdit(null); }}><Icon name="check" size={11} /></button>
              </span>
            ) : (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                {task.cost ? <span className="mono">{D.fmtMoney(task.cost)}</span> : <span className="muted">{lang === "ar" ? "بلا تكلفة" : "no cost"}</span>}
                {canEditCost && <button className="btn btn-ghost" style={{ padding: "1px 6px", fontSize: 11 }} onClick={() => setCostEdit(String(task.cost || ""))}>{task.cost ? t.edit : t.add}</button>}
              </span>
            )}
          </span>
          {template && (
            <>
              <span className="sep">·</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="repeat" size={12} style={{ color: "var(--ink-400)" }} /> {D.recurrenceLabel(template.recurrence, lang)} <span className="muted" style={{ display: "inline-flex", alignItems: "center", gap: 2 }}><Icon name="flame" size={11} /> {D.computeStreak(template.history, template.recurrence.freq)}</span></span>
            </>
          )}
        </div>

        {/* Description = the content. Manager taps the text to edit. */}
        {descEdit !== null ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <textarea dir="auto" autoFocus rows={3} value={descEdit} onChange={(e) => setDescEdit(e.target.value)} style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "8px 10px", fontSize: 13.5, background: "var(--bg-elev)", resize: "vertical", lineHeight: 1.55 }} />
            <div style={{ display: "flex", gap: 6 }}>
              <button className="btn btn-primary" onClick={() => { dispatch({ type: "UPDATE_TASK", id: task.id, patch: { desc: descEdit.trim(), ar_desc: descEdit.trim() } }); setDescEdit(null); }}><Icon name="check" size={12} /> {t.save}</button>
              <button className="btn btn-ghost" onClick={() => setDescEdit(null)}>{t.cancel}</button>
            </div>
          </div>
        ) : (D.taskDesc(task, lang) || role === "manager") ? (
          <div
            className="task-desc"
            onClick={role === "manager" ? () => setDescEdit(D.taskDesc(task, lang) || "") : undefined}
            style={{ cursor: role === "manager" ? "text" : "default" }}
            title={role === "manager" ? t.edit : undefined}
          >
            {D.taskDesc(task, lang) || <span className="muted">{lang === "ar" ? "أضِف وصفًا…" : "Add a description…"}</span>}
          </div>
        ) : null}

        {/* Secondary detail — collapsed by default to keep the panel minimal */}
        {type === "procurement" && (
          <Disclosure title={lang === "ar" ? "عروض الأسعار" : "Quotations"} count={(task.quotations || []).length || null} defaultOpen>
            <QuotationsSection task={task} lang={lang} t={t} role={role} me={me} dispatch={dispatch} bare />
          </Disclosure>
        )}

        <Disclosure title={t.subtasks} count={task.subtasks?.length ? `${task.subtasks.filter((s) => s.done).length}/${task.subtasks.length}` : null}>
          {task.subtasks?.length > 0 && (
            <div className="subtask-progress"><div className="fill" style={{ width: `${(task.subtasks.filter((s) => s.done).length / task.subtasks.length) * 100}%` }} /></div>
          )}
          <div className="subtasks">
            {(task.subtasks || []).map((s) => (
              <button key={s.id} className={`subtask ${s.done ? "done" : ""}`} onClick={() => dispatch({ type: "TOGGLE_SUBTASK", id: task.id, subtaskId: s.id })}>
                <span className="check">{s.done && <Icon name="check" size={9} strokeWidth={3} />}</span>
                <span className="lbl">{lang === "ar" ? s.ar : s.text}</span>
              </button>
            ))}
            <form className="subtask" style={{ color: "var(--ink-400)" }} onSubmit={(e) => { e.preventDefault(); addSubtask(); }}>
              <span className="check"><Icon name="plus" size={10} /></span>
              <input dir="auto" value={newSub} onChange={(e) => setNewSub(e.target.value)} placeholder={t.add_subtask} style={{ border: 0, background: "transparent", outline: "none", flex: 1, fontSize: 13 }} />
            </form>
          </div>
        </Disclosure>

        <Disclosure title={t.documents} count={(task.attachments || []).length || null}>
          <DocumentsSection task={task} lang={lang} t={t} currentUserId={me} dispatch={dispatch} bare />
        </Disclosure>

        {/* Discussion: people's messages + composer */}
        <Disclosure title={t.discussion} count={msgs.length || null} defaultOpen={msgs.length > 0}>
          {msgs.length > 0 && (
            <div className="activity">
              {msgs.map((a, i) => {
                const who = D.findUser(a.who);
                return (
                  <div className="entry" key={i}>
                    <span className="av" style={{ background: who?.color }}>{who?.initials}</span>
                    <div className="bub">
                      <span className="who">{D.userName(who, lang)}</span>
                      <span className="when">{a.ts ? D.timeAgo(a.ts, lang) : a.at}</span>
                      <div style={{ marginTop: 3, color: "var(--ink-700)" }}>{lang === "ar" ? a.ar : a.text}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="composer">
            <textarea
              dir="auto"
              placeholder={t.write_update}
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") sendComment(); }}
            />
            <div className="row">
              <button className="btn btn-primary send" onClick={sendComment} disabled={!comment.trim()}><Icon name="send" size={12} /> {t.send}</button>
            </div>
          </div>
        </Disclosure>

        {/* Activity log (system events) — collapsed; expand to read the history */}
        {sysLog.length > 0 && (
          <Disclosure title={t.activity} count={sysLog.length}>
            <div className="activity">
              {sysLog.map((a, i) => {
                const who = D.findUser(a.who);
                return (
                  <div className="entry" key={i}>
                    <div className="av system"><Icon name="activity" size={11} /></div>
                    <div className="bub system">
                      <span style={{ color: "var(--ink-700)", fontWeight: 500 }}>{D.userName(who, lang)}</span>{" "}
                      {lang === "ar" ? a.ar : a.text}
                      <span style={{ marginInlineStart: 6, color: "var(--ink-300)" }}>· {a.ts ? D.timeAgo(a.ts, lang) : a.at}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Disclosure>
        )}

        {/* Manager-only maintenance, kept quiet at the very bottom */}
        {role === "manager" && (
          <div className="task-foot">
            {task.status === "done" && (
              <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => dispatch({ type: "UPDATE_TASK", id: task.id, patch: { archived: !task.archived } })}>
                <Icon name={task.archived ? "arrow_up" : "check"} size={12} /> {task.archived ? t.unarchive : t.archive}
              </button>
            )}
            <button className="btn btn-ghost" style={{ fontSize: 12, color: "var(--hue-urgent)", marginInlineStart: "auto" }} onClick={() => { if (window.confirm(`${t.delete}: ${D.taskTitle(task, lang)}?`)) { dispatch({ type: "DELETE_TASK", id: task.id }); onClose(); } }}>
              <Icon name="trash" size={12} /> {t.delete}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
