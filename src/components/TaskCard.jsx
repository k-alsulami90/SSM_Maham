import Icon from "./Icon.jsx";
import Avatar from "./Avatar.jsx";
import { PriorityTag, ProjectTag } from "./Tags.jsx";
import * as D from "../data/mock.js";

/* Kanban / grid task card. Draggable when onDragStart is supplied. */
export default function TaskCard({ task, lang, onOpen, selected, draggable, onDragStart, onDragEnd, dragging }) {
  const u = D.findUser(task.assignee);
  const days = D.daysUntil(task.due);
  const overdue = task.status !== "done" && days < 0;
  const due = D.dueLabel(task.due, lang);
  const msgs = task.activity?.filter((a) => a.kind === "msg").length || 0;
  const docs = task.attachments?.length || 0;
  const type = task.type || "assignment";
  const quotes = task.quotations?.length || 0;

  return (
    <div
      className={`card ${selected ? "selected" : ""} ${dragging ? "dragging" : ""}`}
      onClick={() => onOpen(task.id)}
      draggable={draggable}
      onDragStart={draggable ? (e) => onDragStart?.(e, task) : undefined}
      onDragEnd={draggable ? onDragEnd : undefined}
    >
      <div className="tag-row">
        <PriorityTag p={task.priority} lang={lang} />
        {type !== "assignment" && (
          <span className="type-badge"><Icon name={type === "procurement" ? "quote" : "repeat"} size={10} /></span>
        )}
        <ProjectTag projectId={task.project} lang={lang} />
        <span className="mono" style={{ marginInlineStart: "auto", color: "var(--ink-300)", fontSize: 11 }}>
          {task.id}
        </span>
      </div>
      <div className="title">{D.taskTitle(task, lang)}</div>
      <div className="desc">{D.taskDesc(task, lang)}</div>
      <div className="foot">
        <span className={`due ${overdue ? "overdue" : ""}`}>
          <Icon name="calendar" size={11} /> {due}
        </span>
        <span className="stats">
          {task.subtasks?.length > 0 && (
            <span className="stat" title="subtasks">
              <Icon name="check" size={11} />
              {task.subtasks.filter((s) => s.done).length}/{task.subtasks.length}
            </span>
          )}
          {type === "procurement" && quotes > 0 && (
            <span className="stat" title="quotations">
              <Icon name="quote" size={11} />
              {task.selectedQuotationId ? <Icon name="check" size={11} /> : quotes}
            </span>
          )}
          {docs > 0 && (
            <span className="stat" title="documents">
              <Icon name="paperclip" size={11} />
              {docs}
            </span>
          )}
          {msgs > 0 && (
            <span className="stat">
              <Icon name="msg" size={11} />
              {msgs}
            </span>
          )}
        </span>
        <Avatar user={u} size={20} />
      </div>
    </div>
  );
}
