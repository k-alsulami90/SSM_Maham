import { useState } from "react";
import Icon from "../components/Icon.jsx";
import SupplierRatingModal, { Stars } from "../components/SupplierRatingModal.jsx";
import * as D from "../data/mock.js";
import { I18N } from "../data/i18n.js";
import { useStore } from "../store/AppStore.jsx";
import { useToast } from "../components/Toast.jsx";

const uid = () =>
  (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID()
    : "sup-" + Date.now().toString(36) + Math.random().toString(16).slice(2, 8);

const BLANK = { name: "", category: "", taxNumber: "", crNumber: "", contactName: "", phone: "", email: "", paymentTerms: "", iban: "", contractUrl: "" };

/* Supplier registry + data-driven evaluation. Staff-only screen. */
export default function Suppliers() {
  const { suppliers, settings, dispatch } = useStore();
  const { lang, currentUserId } = settings;
  const t = I18N[lang];
  const { notify } = useToast();
  const [editing, setEditing] = useState(null);   // {id?, ...fields} when form open
  const [rating, setRating] = useState(null);      // supplier being evaluated

  const sorted = [...suppliers].sort((a, b) => (b.ratingScore || 0) - (a.ratingScore || 0));

  const save = () => {
    if (!editing.name.trim()) return;
    if (editing.id) {
      dispatch({ type: "UPDATE_SUPPLIER", id: editing.id, patch: editing });
      notify(lang === "ar" ? "تم تحديث المورد" : "Supplier updated");
    } else {
      dispatch({ type: "ADD_SUPPLIER", supplier: { ...editing, id: uid(), active: true, ratingScore: 0, evalCount: 0 } });
      notify(lang === "ar" ? "تمت إضافة المورد" : "Supplier added");
    }
    setEditing(null);
  };

  const submitRating = (scores) => {
    dispatch({
      type: "ADD_EVALUATION",
      evaluation: { id: uid(), supplierId: rating.id, maintenanceId: "", ...scores, createdBy: currentUserId },
    });
    notify(lang === "ar" ? "تم حفظ التقييم" : "Evaluation saved");
    setRating(null);
  };

  const field = (key, label, props = {}) => (
    <label className="qf-cell">
      <span className="qf-label">{label}</span>
      <input className="qf" dir="auto" value={editing[key] || ""} onChange={(e) => setEditing({ ...editing, [key]: e.target.value })} {...props} />
    </label>
  );

  return (
    <div className="content">
      <div className="page-header">
        <div>
          <h1 className="h">{t.suppliers}</h1>
          <p className="sub">{t.suppliers_sub}</p>
        </div>
        <div className="actions">
          <button className="btn btn-primary" onClick={() => setEditing({ ...BLANK })}>
            <Icon name="plus" size={13} /> {t.new_supplier}
          </button>
        </div>
      </div>

      {sorted.length === 0 && <div className="list-wrap"><div className="empty">{lang === "ar" ? "لا يوجد موردون بعد" : "No suppliers yet"}</div></div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
        {sorted.map((s) => (
          <div key={s.id} style={{ background: "var(--bg-elev)", border: "1px solid var(--line)", borderRadius: "var(--r)", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600 }} dir="auto">{s.name}</div>
                {s.category && <span className="tag" style={{ marginTop: 4 }}>{s.category}</span>}
              </div>
              <div style={{ textAlign: "end" }}>
                <Stars score={s.ratingScore} />
                <div className="mono" style={{ fontSize: 12, color: "var(--ink-500)" }}>
                  {s.evalCount ? `${(s.ratingScore || 0).toFixed(2)} · ${s.evalCount} ${t.evaluations_n}` : t.no_rating}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", fontSize: 12.5, color: "var(--ink-500)" }}>
              {s.contactName && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="user" size={11} /> {s.contactName}</span>}
              {s.phone && <span dir="ltr" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="msg" size={11} /> {s.phone}</span>}
              {s.paymentTerms && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="quote" size={11} /> {s.paymentTerms}</span>}
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
              <button className="btn btn-secondary" style={{ flex: 1, justifyContent: "center", fontSize: 12.5 }} onClick={() => setRating(s)}>
                <Icon name="star" size={13} /> {t.evaluate}
              </button>
              <button className="btn btn-ghost" style={{ fontSize: 12.5 }} onClick={() => setEditing({ ...BLANK, ...s })}>
                <Icon name="edit" size={13} /> {t.edit_supplier}
              </button>
              {s.contractUrl && (
                <a className="btn btn-ghost" style={{ fontSize: 12.5 }} href={s.contractUrl} target="_blank" rel="noreferrer"><Icon name="link" size={13} /></a>
              )}
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="modal-mask" onClick={() => setEditing(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="modal-head">
              <div className="h">{editing.id ? t.edit_supplier : t.new_supplier}</div>
              <button className="close icon-btn" onClick={() => setEditing(null)} aria-label={t.cancel}><Icon name="x" size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="qf-row">{field("name", t.supplier_name, { autoFocus: true })}{field("category", t.sup_category)}</div>
              <div className="qf-row">{field("contactName", t.contact_name)}{field("phone", t.phone, { dir: "ltr" })}</div>
              <div className="qf-row">{field("email", t.email, { dir: "ltr" })}{field("paymentTerms", t.payment_terms)}</div>
              <div className="qf-row">{field("taxNumber", t.tax_number, { dir: "ltr" })}{field("crNumber", t.cr_number, { dir: "ltr" })}</div>
              <div className="qf-row">{field("iban", t.iban, { dir: "ltr" })}{field("contractUrl", t.contract_url, { dir: "ltr" })}</div>
            </div>
            <div className="modal-foot" style={{ justifyContent: "space-between" }}>
              {editing.id
                ? <button className="btn btn-ghost" style={{ color: "var(--hue-urgent)" }} onClick={() => { dispatch({ type: "DELETE_SUPPLIER", id: editing.id }); setEditing(null); }}><Icon name="trash" size={13} /> {lang === "ar" ? "حذف" : "Delete"}</button>
                : <span />}
              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn btn-ghost" onClick={() => setEditing(null)}>{t.cancel}</button>
                <button className="btn btn-primary" onClick={save}><Icon name="check" size={13} /> {t.save}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {rating && <SupplierRatingModal supplier={rating} lang={lang} onClose={() => setRating(null)} onSubmit={submitRating} />}
    </div>
  );
}
