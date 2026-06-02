import { createContext, useCallback, useContext, useRef, useState } from "react";
import Icon from "./Icon.jsx";

/* Lightweight toast stack with optional Undo. */
const ToastCtx = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const seq = useRef(0);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((x) => x.id !== id)), []);

  const notify = useCallback(
    (message, opts = {}) => {
      const id = ++seq.current;
      setToasts((list) => [...list, { id, message, undo: opts.undo, undoLabel: opts.undoLabel }]);
      setTimeout(() => dismiss(id), opts.duration || 5000);
      return id;
    },
    [dismiss]
  );

  return (
    <ToastCtx.Provider value={{ notify }}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((tn) => (
          <div className="toast" key={tn.id}>
            <Icon name="check" size={14} />
            <span className="toast-msg">{tn.message}</span>
            {tn.undo && (
              <button
                className="toast-undo"
                onClick={() => {
                  tn.undo();
                  dismiss(tn.id);
                }}
              >
                {tn.undoLabel}
              </button>
            )}
            <button className="toast-x" onClick={() => dismiss(tn.id)} aria-label="Dismiss">
              <Icon name="x" size={13} />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
