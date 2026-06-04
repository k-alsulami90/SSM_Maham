import { useState } from "react";
import Icon from "./Icon.jsx";
import * as D from "../data/mock.js";
import { useTaskActions } from "../store/useTaskActions.js";

/* Quotation comparison + capture for procurement tasks.
   - Member (owner, before a pick): add / remove quotes, flag a recommendation.
   - Manager (task in review, nothing picked yet): compare side-by-side and select. */
export default function QuotationsSection({ task, lang, t, role, me, dispatch, bare }) {
  const { selectQuotation } = useTaskActions();
  const quotes = task.quotations || [];
  const canEdit = role === "member" && task.assignee === me && task.status !== "done" && !task.selectedQuotationId;
  const canSelect = role === "manager" && task.status === "review" && !task.selectedQuotationId;

  const [adding, setAdding] = useState(false);
  const [selecting, setSelecting] = useState(null); // quoteId being confirmed
  const [reason, setReason] = useState("");
  const [form, setForm] = useState({ vendor: "", amount: "", currency: "SAR", validUntil: "", note: "" });

  const submitQuote = (e) => {
    e.preventDefault();
    if (!form.vendor.trim()) return;
    dispatch({
      type: "ADD_QUOTATION",
      id: task.id,
      quote: {
        id: "q" + Date.now(),
        vendor: form.vendor.trim(),
        amount: Number(form.amount) || 0,
        currency: form.currency.trim() || "SAR",
        validUntil: form.validUntil || "",
        fileName: form.fileName || "",
        note: form.note.trim(),
        recommended: false,
      },
    });
    setForm({ vendor: "", amount: "", currency: form.currency, validUntil: "", note: "" });
    setAdding(false);
  };

  return (
    <div>
      {!bare && (
        <div className="section-title">
          {t.quotations}
          {quotes.length > 0 && <span className="muted mono" style={{ fontSize: 11 }}> · {quotes.length}</span>}
          {task.selectedQuotationId && (
            <span className="muted" style={{ fontSize: 11, color: "var(--acc-forest)" }}> · {t.proceeding}</span>
          )}
        </div>
      )}

      <div className="quotes">
        {quotes.length === 0 && <div className="empty" style={{ padding: "18px 10px" }}>{t.no_quotations}</div>}

        {quotes.map((q) => {
          const isSel = task.selectedQuotationId === q.id;
          return (
            <div className={`quote-row ${isSel ? "picked" : ""} ${q.recommended ? "reco" : ""}`} key={q.id}>
              <div className="quote-main">
                <div className="quote-vendor">
                  {D.quotationVendor(q, lang)}
                  {q.recommended && !isSel && (
                    <span className="quote-flag reco" title={t.recommended}><Icon name="star" size={11} /> {t.recommended}</span>
                  )}
                  {isSel && (
                    <span className="quote-flag picked" title={t.selected_quote}><Icon name="check" size={11} /> {t.selected_quote}</span>
                  )}
                </div>
                <div className="quote-amount mono">{D.fmtMoney(q.amount, q.currency)}</div>
              </div>
              <div className="quote-sub">
                {q.validUntil && (
                  <span><Icon name="clock" size={11} /> {t.valid_until} {D.dueLabel(q.validUntil, lang)}</span>
                )}
                {q.fileName && <span><Icon name="file" size={11} /> {q.fileName}</span>}
                {D.quotationNote(q, lang) && <span className="quote-note">{D.quotationNote(q, lang)}</span>}
              </div>

              {(canEdit || canSelect) && (
                <div className="quote-acts">
                  {canEdit && (
                    <>
                      <button
                        className={`mini-btn ${q.recommended ? "on" : ""}`}
                        onClick={() => dispatch({ type: "SET_RECOMMENDED", id: task.id, quoteId: q.id })}
                        title={t.recommend}
                      >
                        <Icon name="star" size={13} />
                      </button>
                      <button className="mini-btn" onClick={() => dispatch({ type: "REMOVE_QUOTATION", id: task.id, quoteId: q.id })} title={t.remove}>
                        <Icon name="trash" size={13} />
                      </button>
                    </>
                  )}
                  {canSelect && selecting !== q.id && (
                    <button className="btn btn-primary" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => { setSelecting(q.id); setReason(""); }}>
                      <Icon name="check" size={12} /> {t.select}
                    </button>
                  )}
                </div>
              )}

              {canSelect && selecting === q.id && (
                <div className="quote-confirm">
                  <input
                    autoFocus
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={t.selection_reason}
                    style={{ flex: 1, border: "1px solid var(--line)", borderRadius: 6, padding: "5px 8px", fontSize: 12.5, background: "var(--bg-elev)" }}
                  />
                  <button className="btn btn-primary" style={{ padding: "5px 10px", fontSize: 12 }} onClick={() => { selectQuotation(task, q.id, reason.trim()); setSelecting(null); }}>
                    {t.select}
                  </button>
                  <button className="btn btn-ghost" style={{ padding: "5px 8px", fontSize: 12 }} onClick={() => setSelecting(null)}>
                    <Icon name="x" size={12} />
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {canEdit && !adding && (
          <button type="button" className="doc-drop" onClick={() => setAdding(true)}>
            <Icon name="plus" size={15} /> <span>{t.add_quote}</span>
          </button>
        )}

        {canEdit && adding && (
          <form className="quote-form" onSubmit={submitQuote}>
            <input className="qf" dir="auto" placeholder={t.vendor} value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} autoFocus />
            <div className="qf-row">
              <input className="qf" type="number" min="0" placeholder={t.amount} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              <input className="qf qf-cur" placeholder="SAR" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
            </div>
            <label className="qf-label">{t.valid_until}</label>
            <input className="qf" type="date" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} />
            <input className="qf" dir="auto" placeholder={t.note_label} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            <div className="qf-row" style={{ justifyContent: "flex-end", gap: 6 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setAdding(false)}>{t.cancel}</button>
              <button type="submit" className="btn btn-primary"><Icon name="plus" size={12} /> {t.add_quote}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
