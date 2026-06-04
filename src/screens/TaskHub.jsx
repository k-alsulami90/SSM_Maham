import { useState } from "react";
import Icon from "../components/Icon.jsx";
import FilterBar from "../components/FilterBar.jsx";
import Kanban from "../components/Kanban.jsx";
import ListView from "../components/ListView.jsx";
import EmptyState from "../components/EmptyState.jsx";
import * as D from "../data/mock.js";
import { I18N } from "../data/i18n.js";
import { useStore } from "../store/AppStore.jsx";
import { useTaskActions } from "../store/useTaskActions.js";

/* Advanced task organization hub — kanban + list, filters, drag-to-transition.
   Members see only their own tasks; managers see the whole workspace. */
export default function TaskHub({ onOpen, openId, onCreate, defaultView = "kanban" }) {
  const { tasks, settings } = useStore();
  const { setStatus } = useTaskActions();
  const { lang, role, currentUserId } = settings;
  const t = I18N[lang];

  const [view, setView] = useState(defaultView);
  const [filters, setFilters] = useState({ project: null, assignee: null, priority: null });
  const [showArchived, setShowArchived] = useState(false);

  const scope = role === "member" ? tasks.filter((x) => x.assignee === currentUserId) : tasks;
  const archivedCount = scope.filter((tk) => tk.archived).length;
  const filtered = scope.filter(
    (tk) =>
      (showArchived ? tk.archived : !tk.archived) &&
      (!filters.project || tk.project === filters.project) &&
      (!filters.assignee || tk.assignee === filters.assignee) &&
      (!filters.priority || tk.priority === filters.priority)
  );

  const onMove = (taskId, status) => {
    const task = tasks.find((x) => x.id === taskId);
    if (task && task.status !== status) setStatus(task, status);
  };

  const exportCsv = () => {
    const head = ["ID", "Title", "Status", "Priority", "Project", "Assignee", "Due"];
    const esc = (s) => `"${String(s ?? "").replace(/"/g, '""')}"`;
    const rows = filtered.map((tk) => [
      tk.id,
      D.taskTitle(tk, lang),
      D.statusLabel(tk.status, lang),
      D.priorityLabel(tk.priority, lang),
      D.projectName(D.findProject(tk.project), lang),
      D.userName(D.findUser(tk.assignee), lang),
      tk.due,
    ]);
    const csv = "﻿" + [head, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "maham-tasks.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="content">
      <div className="page-header">
        <div>
          <h1 className="h">{role === "member" ? t.my_tasks : t.task_hub}</h1>
          <p className="sub">
            {lang === "ar" ? `${filtered.length} مهمة` : `${filtered.length} ${filtered.length === 1 ? "task" : "tasks"}`}
            {role === "manager" && (lang === "ar" ? " عبر المشاريع" : " across all projects")}
          </p>
        </div>
        <div className="actions">
          <button className={`btn ${showArchived ? "btn-primary" : "btn-secondary"}`} onClick={() => setShowArchived((v) => !v)} title={t.show_archived}>
            <Icon name="check" size={13} /> {t.archived}{archivedCount > 0 ? ` (${archivedCount})` : ""}
          </button>
          <button className="btn btn-secondary" onClick={exportCsv}><Icon name="download" size={13} /> {t.export}</button>
          {role === "manager" && <button className="btn btn-primary" onClick={onCreate}><Icon name="plus" size={13} /> {t.new_task}</button>}
        </div>
      </div>

      <FilterBar lang={lang} view={view} setView={setView} filters={filters} setFilters={setFilters} />

      {filtered.length === 0 ? (
        <EmptyState
          icon="hub"
          title={showArchived ? (lang === "ar" ? "لا مهام مؤرشفة" : "Nothing archived") : (lang === "ar" ? "لا مهام بعد" : "No tasks yet")}
          hint={role === "manager"
            ? (lang === "ar" ? "أنشئ أول مهمة لفريقك، وستظهر هنا على اللوحة." : "Create the first task for your team; it shows up here on the board.")
            : (lang === "ar" ? "ستظهر المهام المُسنَدة إليك هنا." : "Tasks assigned to you will appear here.")}
          actionLabel={role === "manager" && !showArchived ? t.new_task : undefined}
          onAction={role === "manager" && !showArchived ? onCreate : undefined}
        />
      ) : view === "kanban" ? (
        <Kanban tasks={filtered} lang={lang} onOpen={onOpen} selectedId={openId} onMove={onMove} onCreate={onCreate} />
      ) : (
        <ListView tasks={filtered} lang={lang} onOpen={onOpen} selectedId={openId} />
      )}
    </div>
  );
}
