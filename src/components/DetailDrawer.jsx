import { useEffect, useState } from "react";
import Icon from "./Icon.jsx";
import Avatar from "./Avatar.jsx";
import { PriorityTag } from "./Tags.jsx";
import DocumentsSection from "./DocumentsSection.jsx";
import QuotationsSection from "./QuotationsSection.jsx";
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
        <div className="field-grid">
          <div className="k">{t.filter_status}</div>
          <div className="v">
            <span style={{ width: 8, height: 8, borderRadius: 2, background: D.STATUS_META[task.status].dot }} />
            {D.statusLabel(task.status, lang)}
          </div>
          <div className="k">{t.priority}</div>
          <div className="v"><PriorityTag p={task.priority} lang={lang} /></div>
          <div className="k">{t.assignee}</div>
          <div className="v">
            {role === "manager" ? (
              <select
                value={task.assignee || ""}
                onChange={(e) => dispatch({ type: "UPDATE_TASK", id: task.id, patch: { assignee: e.target.value } })}
                style={{ padding: "3px 6px", border: "1px solid var(--line)", borderRadius: 6, background: "var(--bg-elev)", fontSize: 12.5, maxWidth: "100%" }}
              >
                <option value="">—</option>
                {D.getUsers().map((x) => <option key={x.id} value={x.id}>{D.userName(x, lang)}</option>)}
              </select>
            ) : (
              <><Avatar user={u} size={20} />{D.userName(u, lang)}</>
            )}
          </div>
          <div className="k">{t.due}</div>
          <div className="v mono" style={{ fontSize: 12.5 }}>{D.dueLabel(task.due, lang)}</div>
          <div className="k">{t.cost}</div>
          <div className="v">
            {costEdit !== null ? (
              <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
                <input type="number" autoFocus value={costEdit} onChange={(e) => setCostEdit(e.target.value)} style={{ width: 90, padding: "3px 6px", border: "1px solid var(--line)", borderRadius: 6, background: "var(--bg-elev)" }} />
                <span className="muted">SAR</span>
                <button className="btn btn-primary" style={{ padding: "3px 8px", fontSize: 12 }} onClick={() => { dispatch({ type: "UPDATE_TASK", id: task.id, patch: { cost: Number(costEdit) || 0 } }); setCostEdit(null); }}><Icon name="check" size={11} /></button>
              </span>
            ) : (
              <>
                <span className="mono">{task.cost ? D.fmtMoney(task.cost) : "—"}</span>
                {(role === "manager" || task.assignee === me) && (
                  <button className="btn btn-ghost" style={{ padding: "1px 6px", fontSize: 11, marginInlineStart: 4 }} onClick={() => setCostEdit(String(task.cost || ""))}>
                    {task.cost ? t.edit : t.add}
                  </button>
                )}
              </>
            )}
          </div>
          {template && (
            <>
              <div className="k">{t.repeats}</div>
              <div className="v">
                <Icon name="repeat" size={13} /> {D.recurrenceLabel(template.recurrence, lang)}
                <span className="muted" style={{ marginInlineStart: 6, display: "inline-flex", alignItems: "center", gap: 3 }}>
                  <Icon name="flame" size={12} /> {D.computeStreak(template.history, template.recurrence.freq)} {t.streak}
                </span>
              </div>
            </>
          )}
        </div>

        {(mAct || mgrAct) && <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{mAct}{mgrAct}</div>}

        {role === "manager" && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {task.status === "done" && (
              <button className="btn btn-secondary" onClick={() => dispatch({ type: "UPDATE_TASK", id: task.id, patch: { archived: !task.archived } })}>
                <Icon name={task.archived ? "arrow_up" : "check"} size={12} /> {task.archived ? t.unarchive : t.archive}
              </button>
            )}
            <button className="btn btn-danger" onClick={() => { if (window.confirm(`${t.delete}: ${D.taskTitle(task, lang)}?`)) { dispatch({ type: "DELETE_TASK", id: task.id }); onClose(); } }}>
              <Icon name="trash" size={12} /> {t.delete}
            </button>
          </div>
        )}

        <div>
          <div className="section-title" style={{ display: "flex", alignItems: "center" }}>
            <span>{t.description}</span>
            {role === "manager" && descEdit === null && (
              <button className="btn btn-ghost" style={{ marginInlineStart: "auto", padding: "1px 6px", fontSize: 11 }} onClick={() => setDescEdit(D.taskDesc(task, lang) || "")}>{t.edit}</button>
            )}
          </div>
          {descEdit !== null ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <textarea dir="auto" rows={3} value={descEdit} onChange={(e) => setDescEdit(e.target.value)} style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "8px 10px", fontSize: 13, background: "var(--bg-elev)", resize: "vertical" }} />
              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn btn-primary" onClick={() => { dispatch({ type: "UPDATE_TASK", id: task.id, patch: { desc: descEdit.trim(), ar_desc: descEdit.trim() } }); setDescEdit(null); }}><Icon name="check" size={12} /> {t.save}</button>
                <button className="btn btn-ghost" onClick={() => setDescEdit(null)}>{t.cancel}</button>
              </div>
            </div>
          ) : (
            <div className="desc-block">{D.taskDesc(task, lang) || <span className="muted">—</span>}</div>
          )}
        </div>

        {type === "procurement" && (
          <QuotationsSection task={task} lang={lang} t={t} role={role} me={me} dispatch={dispatch} />
        )}
        {/* Documents (incl. invoices) on every task */}
        <DocumentsSection task={task} lang={lang} t={t} currentUserId={me} dispatch={dispatch} />

        <div>
          <div className="section-title">
            {t.subtasks}
            {task.subtasks?.length > 0 && (
              <span className="muted mono" style={{ fontSize: 11 }}>
                {" "}· {task.subtasks.filter((s) => s.done).length}/{task.subtasks.length}
              </span>
            )}
          </div>
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
        </div>

        <div>
          <div className="section-title">{t.discussion}</div>
          <div className="activity">
            {(task.activity || []).map((a, i) => {
              const who = D.findUser(a.who);
              if (a.kind === "system") {
                return (
                  <div className="entry" key={i}>
                    <div className="av system"><Icon name="activity" size={11} /></div>
                    <div className="bub system">
                      <span style={{ color: "var(--ink-700)", fontWeight: 500 }}>{D.userName(who, lang)}</span>{" "}
                      {lang === "ar" ? a.ar : a.text}
                      <span style={{ marginInlineStart: 6, color: "var(--ink-300)" }}>· {a.at}</span>
                    </div>
                  </div>
                );
              }
              return (
                <div className="entry" key={i}>
                  <span className="av" style={{ background: who?.color }}>{who?.initials}</span>
                  <div className="bub">
                    <span className="who">{D.userName(who, lang)}</span>
                    <span className="when">{a.at}</span>
                    <div style={{ marginTop: 3, color: "var(--ink-700)" }}>{lang === "ar" ? a.ar : a.text}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

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
      </div>
    </aside>
  );
}
