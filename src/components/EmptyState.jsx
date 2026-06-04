import Icon from "./Icon.jsx";

/* Calm, on-brand empty state: says what appears here, why it matters, and (for
   managers) offers the first action. Used in place of bare "—" / "no items". */
export default function EmptyState({ icon = "box", title, hint, actionLabel, onAction }) {
  return (
    <div className="empty-state">
      <div className="empty-state-ic"><Icon name={icon} size={22} /></div>
      {title && <div className="empty-state-title" dir="auto">{title}</div>}
      {hint && <div className="empty-state-hint" dir="auto">{hint}</div>}
      {actionLabel && onAction && (
        <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={onAction}>
          <Icon name="plus" size={13} /> {actionLabel}
        </button>
      )}
    </div>
  );
}
