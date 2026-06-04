import { useState } from "react";
import Icon from "./Icon.jsx";
import TaskCard from "./TaskCard.jsx";
import * as D from "../data/mock.js";

const COLS = ["backlog", "progress", "review", "done"];

/* Kanban board with native drag-and-drop between columns.
   onMove(taskId, newStatus) commits a status change to the store. */
export default function Kanban({ tasks, lang, onOpen, selectedId, onMove, onCreate }) {
  const [dragId, setDragId] = useState(null);
  const [overCol, setOverCol] = useState(null);

  const onDragStart = (e, task) => {
    setDragId(task.id);
    e.dataTransfer.effectAllowed = "move";
    try {
      e.dataTransfer.setData("text/plain", task.id);
    } catch {
      /* some browsers restrict setData */
    }
  };

  const drop = (status) => {
    if (dragId) onMove?.(dragId, status);
    setDragId(null);
    setOverCol(null);
  };

  return (
    <div className="kanban">
      {COLS.map((s) => {
        const items = tasks.filter((x) => x.status === s);
        return (
          <div className="column" key={s}>
            <div className="column-head">
              <span className="dotline" style={{ background: D.STATUS_META[s].dot }} />
              <span className="name">{D.statusLabel(s, lang)}</span>
              <span className="pill">{items.length}</span>
              {onCreate && <button className="add" title={lang === "ar" ? "إضافة مهمة" : "Add task"} aria-label={lang === "ar" ? "إضافة مهمة" : "Add task"} onClick={onCreate}><Icon name="plus" size={13} /></button>}
            </div>
            <div
              className={`column-body ${overCol === s && dragId ? "drop-over" : ""}`}
              onDragOver={(e) => {
                if (!dragId) return;
                e.preventDefault();
                setOverCol(s);
              }}
              onDragLeave={() => setOverCol((c) => (c === s ? null : c))}
              onDrop={(e) => {
                e.preventDefault();
                drop(s);
              }}
            >
              {items.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  lang={lang}
                  onOpen={onOpen}
                  selected={selectedId === task.id}
                  draggable={!!onMove}
                  onDragStart={onDragStart}
                  onDragEnd={() => {
                    setDragId(null);
                    setOverCol(null);
                  }}
                  dragging={dragId === task.id}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
