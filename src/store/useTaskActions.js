import { useStore } from "./AppStore.jsx";
import { useToast } from "../components/Toast.jsx";
import { I18N } from "../data/i18n.js";

/* Centralizes task mutations so every status change emits a toast with Undo,
   and Undo restores the exact prior snapshot (incl. recurring streak). */
export function useTaskActions() {
  const { tasks, templates, settings, dispatch } = useStore();
  const { notify } = useToast();
  const me = settings.currentUserId;
  const t = I18N[settings.lang];

  const snapshot = (id) => tasks.find((x) => x.id === id);

  const withUndo = (prevTask, message) => {
    const prevTemplates = prevTask?.type === "recurring" ? templates : null;
    notify(message, {
      undoLabel: t.undo,
      undo: () => dispatch({ type: "RESTORE_TASK", task: prevTask, templates: prevTemplates }),
    });
  };

  const setStatus = (task, status, { logKey, message } = {}) => {
    const prev = snapshot(task.id);
    dispatch({ type: "SET_STATUS", id: task.id, status, logKey, actorId: me });
    withUndo(prev, message || t.toast_moved);
  };

  return {
    setStatus,
    approve: (task) => setStatus(task, "done", { message: t.toast_approved }),
    reject: (task, reason) => {
      const prev = snapshot(task.id);
      if (reason && reason.trim()) dispatch({ type: "ADD_COMMENT", id: task.id, text: reason.trim(), actorId: me });
      dispatch({ type: "SET_STATUS", id: task.id, status: "progress", logKey: "rejected", actorId: me });
      withUndo(prev, t.toast_rejected);
    },
    submit: (task) => setStatus(task, "review", { message: t.toast_submitted }),
    start: (task) => setStatus(task, "progress", { message: t.toast_moved }),
    markDone: (task) => setStatus(task, "done", { message: t.toast_done }),
    selectQuotation: (task, quoteId, reason) => {
      const prev = snapshot(task.id);
      dispatch({ type: "SELECT_QUOTATION", id: task.id, quoteId, reason, actorId: me });
      withUndo(prev, t.toast_selected);
    },
  };
}
