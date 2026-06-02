import Icon from "./Icon.jsx";
import Avatar from "./Avatar.jsx";
import * as D from "../data/mock.js";

export function MetricCard({ label, icon, value, unit, delta, deltaDir, spark, onClick }) {
  return (
    <div
      className={`metric ${onClick ? "clickable" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
    >
      <div className="label"><Icon name={icon} size={13} /> {label}</div>
      <div className="value">
        {value}
        {unit && <span className="unit">{unit}</span>}
      </div>
      {delta && (
        <div className={`delta ${deltaDir}`}>
          <Icon name={deltaDir === "up" ? "arrow_up" : deltaDir === "down" ? "arrow_down" : "arrow_right"} size={10} />
          {delta}
        </div>
      )}
      {spark && <span className="spark">{spark}</span>}
      {onClick && <Icon name="arrow_right" size={13} className="metric-go" />}
    </div>
  );
}

export function MemberMetric({ icon, label, value, hint, onClick }) {
  return (
    <div className={`metric ${onClick ? "clickable" : ""}`} onClick={onClick} role={onClick ? "button" : undefined} tabIndex={onClick ? 0 : undefined}>
      <div className="label"><Icon name={icon} size={13} /> {label}</div>
      <div className="value">{value}</div>
      <div style={{ fontSize: 12, color: "var(--ink-500)", marginTop: -2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {hint}
      </div>
      {onClick && <Icon name="arrow_right" size={13} className="metric-go" />}
    </div>
  );
}

export function WorkloadBar({ user, tasks, lang, max }) {
  const byStatus = ["backlog", "progress", "review", "done"].map((s) => ({
    s,
    n: tasks.filter((t) => t.assignee === user.id && t.status === s).length,
  }));
  const total = byStatus.reduce((a, b) => a + b.n, 0);
  const cls = { backlog: "todo", progress: "prog", review: "review", done: "done" };
  return (
    <div className="row">
      <div className="who">
        <Avatar user={user} size={22} />
        <span className="name">{D.userName(user, lang)}</span>
      </div>
      <div className="bar">
        {byStatus.map(({ s, n }) =>
          n > 0 ? (
            <div key={s} className={`seg ${cls[s]}`} style={{ width: `${(n / (max || 1)) * 100}%` }}>
              {n}
            </div>
          ) : null
        )}
      </div>
      <div className="total">{total}</div>
    </div>
  );
}

export function Donut({ data, size = 132 }) {
  const total = data.reduce((a, d) => a + d.n, 0) || 1;
  const r = size / 2 - 12;
  const cx = size / 2;
  const cy = size / 2;
  let acc = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--line-soft)" strokeWidth="14" />
      {data.map((d, i) => {
        const frac = d.n / total;
        if (frac === 0) return null;
        const a0 = acc * Math.PI * 2 - Math.PI / 2;
        const a1 = (acc + frac) * Math.PI * 2 - Math.PI / 2;
        acc += frac;
        const x0 = cx + r * Math.cos(a0);
        const y0 = cy + r * Math.sin(a0);
        const x1 = cx + r * Math.cos(a1);
        const y1 = cy + r * Math.sin(a1);
        const large = frac > 0.5 ? 1 : 0;
        return (
          <path
            key={i}
            d={`M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`}
            fill="none"
            stroke={d.color}
            strokeWidth="14"
            strokeLinecap="butt"
          />
        );
      })}
      <text x={cx} y={cy - 2} textAnchor="middle" fontSize="22" fontWeight="600" fill="var(--ink-900)" fontFamily="var(--font-mono)" style={{ fontFeatureSettings: '"tnum"' }}>
        {total}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize="10" fill="var(--ink-400)" letterSpacing="0.05em">
        TOTAL
      </text>
    </svg>
  );
}
