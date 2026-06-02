import Icon from "./Icon.jsx";
import * as D from "../data/mock.js";

export function PriorityTag({ p, lang }) {
  return (
    <span className={`tag priority-${p}`}>
      <span className="dot" />
      {D.priorityLabel(p, lang)}
    </span>
  );
}

export function ProjectTag({ projectId, lang }) {
  const p = D.findProject(projectId);
  return (
    <span className="tag project">
      <span style={{ width: 6, height: 6, borderRadius: 2, background: D.projectDot(projectId) }} />
      {D.projectName(p, lang)}
    </span>
  );
}

export function StatusPill({ status, lang }) {
  return (
    <span
      style={{
        fontSize: 11.5,
        fontWeight: 500,
        color: "var(--ink-700)",
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: 2, background: D.STATUS_META[status].dot }} />
      {D.statusLabel(status, lang)}
    </span>
  );
}

/* Sparkline for metric cards. */
export function Sparkline({ points, color = "var(--ink-300)" }) {
  const w = 64;
  const h = 22;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const path = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - ((p - min) / (max - min || 1)) * h;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}

export { Icon };
