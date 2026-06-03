import { useState } from "react";
import Icon from "./Icon.jsx";
import { I18N } from "../data/i18n.js";

/* Post-maintenance / manual supplier evaluation. Four weighted KPIs (1–5):
   Quality 30%, Timeliness 30%, Pricing 20%, Service 20%. Returns the scores
   plus the weighted result; the store/DB recompute the supplier's average. */
export default function SupplierRatingModal({ supplier, lang, onClose, onSubmit }) {
  const t = I18N[lang];
  const [s, setS] = useState({ quality: 4, timeliness: 4, cost: 4, service: 4 });
  const [note, setNote] = useState("");
  const weighted = Math.round((s.quality * 0.3 + s.timeliness * 0.3 + s.cost * 0.2 + s.service * 0.2) * 100) / 100;

  const kpis = [
    { key: "quality", label: t.kpi_quality, w: "30%" },
    { key: "timeliness", label: t.kpi_timeliness, w: "30%" },
    { key: "cost", label: t.kpi_cost, w: "20%" },
    { key: "service", label: t.kpi_service, w: "20%" },
  ];

  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={t.rate_supplier}>
        <div className="modal-head">
          <div>
            <div className="h">{t.rate_supplier}</div>
            <div className="key" dir="auto">{supplier?.name}</div>
          </div>
          <button className="close icon-btn" onClick={onClose} aria-label={t.cancel}><Icon name="x" size={16} /></button>
        </div>
        <div className="modal-body">
          <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>{t.rate_supplier_hint}</p>
          {kpis.map((k) => (
            <div key={k.key}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                <span style={{ fontWeight: 500 }}>{k.label} <span className="muted" style={{ fontSize: 11 }}>({k.w})</span></span>
                <span className="mono">{s[k.key]}/5</span>
              </div>
              <div className="seg-row" style={{ padding: 0, gap: 6 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`btn ${s[k.key] === n ? "btn-primary" : "btn-secondary"}`}
                    style={{ flex: 1, justifyContent: "center", padding: "9px 0" }}
                    onClick={() => setS({ ...s, [k.key]: n })}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg-sand)", borderRadius: 10, padding: "10px 14px", marginTop: 2 }}>
            <span style={{ fontWeight: 600 }}>{t.overall_score}</span>
            <span className="mono" style={{ fontWeight: 700, fontSize: 18, color: "var(--acc-forest)" }}>
              {weighted.toFixed(2)}<span className="muted" style={{ fontSize: 12 }}> / 5</span>
            </span>
          </div>
          <textarea
            className="qf"
            rows={2}
            placeholder={lang === "ar" ? "ملاحظة (اختياري)" : "Note (optional)"}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            dir="auto"
          />
        </div>
        <div className="modal-foot" style={{ justifyContent: "flex-end" }}>
          <button className="btn btn-ghost" onClick={onClose}>{t.cancel}</button>
          <button className="btn btn-primary" onClick={() => onSubmit({ ...s, weightedScore: weighted, note })}>
            <Icon name="check" size={13} /> {t.save}
          </button>
        </div>
      </div>
    </div>
  );
}

/* Small read-only star rating used in lists. */
export function Stars({ score = 0, size = 13 }) {
  const full = Math.round(score);
  return (
    <span style={{ display: "inline-flex", gap: 1 }} aria-label={`${score}/5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Icon key={n} name="star" size={size} style={{ color: n <= full ? "var(--hue-high)" : "var(--line-strong)" }} />
      ))}
    </span>
  );
}
