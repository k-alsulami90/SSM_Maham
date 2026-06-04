import { useState } from "react";
import Icon from "./Icon.jsx";

/* Collapsible section. Keeps detail pages minimal: secondary content (lists,
   logs, documents) stays behind a quiet header with a count until opened. */
export default function Disclosure({ title, count, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="disc">
      <button type="button" className="disc-head" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <Icon name={open ? "chev_down" : "chev_right"} size={14} style={{ color: "var(--ink-400)" }} />
        <span>{title}</span>
        {count != null && <span className="disc-count">{count}</span>}
      </button>
      {open && <div className="disc-body">{children}</div>}
    </div>
  );
}
