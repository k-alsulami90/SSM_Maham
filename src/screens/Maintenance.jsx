import { useState } from "react";
import Icon from "../components/Icon.jsx";
import { MetricCard } from "../components/DashWidgets.jsx";
import SupplierRatingModal from "../components/SupplierRatingModal.jsx";
import * as D from "../data/mock.js";
import * as F from "../data/fleet.js";
import * as A from "../data/assets.js";
import { I18N } from "../data/i18n.js";
import { useStore } from "../store/AppStore.jsx";
import { useToast } from "../components/Toast.jsx";

/* Normalize a vehicle/asset's embedded maintenance entry to the hub's shape so
   the centralized page can show every maintenance event in one place. These
   live on their parent record (read-only here; edited on the asset's page). */
function normEmbed(m, targetType, targetId, label) {
  return {
    id: targetType + ":" + targetId + ":" + m.id, rawId: m.id, source: targetType, readOnly: true,
    targetType, targetId, targetLabel: label,
    maintenanceType: m.maintenanceType || "corrective", status: m.status || "completed",
    logDate: m.date || m.logDate || "", scheduledDate: m.scheduledDate || "",
    description: m.ar_note || m.note || "", cost: Number(m.cost) || 0,
    supplierId: "", vendorName: m.vendor || "", meterReading: m.odometer ?? m.meterReading,
    partsReplaced: m.partsReplaced || [],
  };
}

const uid = () =>
  (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID()
    : "mnt-" + Date.now().toString(36) + Math.random().toString(16).slice(2, 8);
const todayISO = () => new Date().toISOString().slice(0, 10);
const ymOf = (d) => (d || "").slice(0, 7);

const vehLabel = (v) => v?.name || v?.plate || [v?.make, v?.model].filter(Boolean).join(" ") || v?.id || "";
const assetLabel = (a) => a?.name || [a?.make, a?.model].filter(Boolean).join(" ") || a?.id || "";

const STATUS_TONE = {
  scheduled: { bg: "var(--hue-med-bg)", fg: "var(--hue-med)" },
  in_progress: { bg: "var(--hue-high-bg)", fg: "var(--hue-high)" },
  completed: { bg: "var(--hue-low-bg)", fg: "var(--hue-low)" },
};

const blankLog = () => ({
  targetType: "vehicle", targetId: "", targetLabel: "",
  maintenanceType: "corrective", status: "scheduled",
  logDate: "", scheduledDate: "", description: "",
  technicianId: "", supplierId: "", cost: 0, meterReading: "", partsReplaced: [],
});

/* Centralized maintenance hub across fleet / equipment / facilities. */
export default function Maintenance() {
  const { maintenance, vehicles, assets, suppliers, projects, settings, dispatch } = useStore();
  const { lang, currentUserId } = settings;
  const t = I18N[lang];
  const { notify } = useToast();

  const [view, setView] = useState("history");       // history (all) | upcoming
  const [filters, setFilters] = useState({ targetType: "", type: "", supplier: "" });
  const [editing, setEditing] = useState(null);
  const [completing, setCompleting] = useState(null); // log → rate its supplier

  const supplierName = (id) => suppliers.find((s) => s.id === id)?.name || "";

  // Unified view: standalone work-orders + embedded vehicle/asset maintenance.
  const merged = [
    ...maintenance.map((m) => ({ ...m, source: "log" })),
    ...vehicles.flatMap((v) => (v.maintenance || []).map((m) => normEmbed(m, "vehicle", v.id, F.vehicleLabel(v)))),
    ...assets.flatMap((a) => (a.maintenance || []).map((m) => normEmbed(m, "asset", a.id, A.assetName(a, "ar")))),
  ];

  // ---- metrics ----
  const active = merged.filter((m) => m.status !== "completed").length;
  const monthCost = merged
    .filter((m) => ymOf(m.logDate || m.scheduledDate) === ymOf(todayISO()))
    .reduce((s, m) => s + (Number(m.cost) || 0), 0);
  const scheduledPrev = merged.filter((m) => m.status === "scheduled" && m.maintenanceType === "preventive").length;
  const overdue = merged.filter((m) => m.status !== "completed" && m.scheduledDate && D.daysUntil(m.scheduledDate) < 0);

  // ---- filtering ----
  const pass = (m) =>
    (!filters.targetType || m.targetType === filters.targetType) &&
    (!filters.type || m.maintenanceType === filters.type) &&
    (!filters.supplier || m.supplierId === filters.supplier);

  const items = merged.filter(pass);
  const list = view === "history"
    ? [...items].sort((a, b) => (b.logDate || b.scheduledDate || "").localeCompare(a.logDate || a.scheduledDate || ""))
    : items.filter((m) => m.status !== "completed").sort((a, b) => (a.scheduledDate || "9999").localeCompare(b.scheduledDate || "9999"));

  // ---- actions ----
  const saveLog = () => {
    if (!editing.targetLabel.trim() && !editing.targetId) {
      notify(lang === "ar" ? "اختر الأصل أو الجهة" : "Pick a target");
      return;
    }
    if (editing.id) {
      dispatch({ type: "UPDATE_MAINT_LOG", id: editing.id, patch: editing });
    } else {
      dispatch({ type: "ADD_MAINT_LOG", maintenance: { ...editing, id: uid(), createdBy: currentUserId } });
    }
    notify(lang === "ar" ? "تم الحفظ" : "Saved");
    setEditing(null);
  };

  const removeRow = (m) => {
    if (!window.confirm(lang === "ar" ? "حذف سجل الصيانة؟" : "Delete this maintenance record?")) return;
    if (m.source === "log") dispatch({ type: "DELETE_MAINT_LOG", id: m.id });
    else if (m.source === "vehicle") dispatch({ type: "DELETE_VEH_MAINT", vehicleId: m.targetId, entryId: m.rawId });
    else if (m.source === "asset") dispatch({ type: "DELETE_ASSET_MAINT", assetId: m.targetId, entryId: m.rawId });
    notify(lang === "ar" ? "تم الحذف" : "Deleted");
  };

  const markCompleted = (m) => {
    const patch = { status: "completed", logDate: m.logDate || todayISO() };
    dispatch({ type: "UPDATE_MAINT_LOG", id: m.id, patch });
    if (m.supplierId) setCompleting({ ...m, ...patch });   // prompt rating
    else notify(t.status_completed);
  };

  const submitRating = (scores) => {
    dispatch({
      type: "ADD_EVALUATION",
      evaluation: { id: uid(), supplierId: completing.supplierId, maintenanceId: completing.id, ...scores, createdBy: currentUserId },
    });
    notify(lang === "ar" ? "تم حفظ التقييم" : "Evaluation saved");
    setCompleting(null);
  };

  // ---- target picker wiring for the form ----
  const onPickTarget = (type, id) => {
    let label = "";
    if (type === "vehicle") label = vehLabel(vehicles.find((v) => v.id === id));
    else if (type === "asset") label = assetLabel(assets.find((a) => a.id === id));
    setEditing((e) => ({ ...e, targetType: type, targetId: id, targetLabel: label }));
  };

  const setPart = (i, key, val) => setEditing((e) => ({ ...e, partsReplaced: e.partsReplaced.map((p, j) => (j === i ? { ...p, [key]: val } : p)) }));
  const addPart = () => setEditing((e) => ({ ...e, partsReplaced: [...(e.partsReplaced || []), { name: "", qty: 1, cost: 0 }] }));
  const delPart = (i) => setEditing((e) => ({ ...e, partsReplaced: e.partsReplaced.filter((_, j) => j !== i) }));

  return (
    <div className="content">
      <div className="page-header">
        <div>
          <h1 className="h">{t.maintenance}</h1>
          <p className="sub">{t.maintenance_sub}</p>
        </div>
        <div className="actions">
          <button className="btn btn-primary" onClick={() => setEditing(blankLog())}>
            <Icon name="plus" size={13} /> {t.new_maintenance}
          </button>
        </div>
      </div>

      {overdue.length > 0 && (
        <div className="callout" style={{ background: "var(--hue-urgent-bg)", borderColor: "oklch(0.85 0.06 40)", color: "var(--hue-urgent)", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name="bell" size={14} /> {overdue.length} {t.overdue_maint}
        </div>
      )}

      <div className="metric-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <MetricCard icon="wrench" label={t.maint_active} value={active} />
        <MetricCard icon="quote" label={t.maint_month_cost} value={D.fmtMoney(monthCost)} />
        <MetricCard icon="repeat" label={t.maint_scheduled} value={scheduledPrev} />
      </div>

      <div className="filters" style={{ marginTop: 14 }}>
        <div className="tabbar">
          <button className={view === "upcoming" ? "active" : ""} onClick={() => setView("upcoming")}>
            <Icon name="clock" size={11} style={{ marginInlineEnd: 4 }} /> {t.maint_upcoming}
          </button>
          <button className={view === "history" ? "active" : ""} onClick={() => setView("history")}>
            <Icon name="list" size={11} style={{ marginInlineEnd: 4 }} /> {t.maint_history}
          </button>
        </div>
        <select className="qf" style={{ width: "auto" }} value={filters.targetType} onChange={(e) => setFilters({ ...filters, targetType: e.target.value })}>
          <option value="">{t.maint_target}: {t.filter_all}</option>
          <option value="vehicle">{t.target_vehicle}</option>
          <option value="asset">{t.target_asset}</option>
          <option value="facility">{t.target_facility}</option>
        </select>
        <select className="qf" style={{ width: "auto" }} value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
          <option value="">{t.maint_type}: {t.filter_all}</option>
          <option value="preventive">{t.type_preventive}</option>
          <option value="corrective">{t.type_corrective}</option>
        </select>
        <select className="qf" style={{ width: "auto" }} value={filters.supplier} onChange={(e) => setFilters({ ...filters, supplier: e.target.value })}>
          <option value="">{t.supplier}: {t.filter_all}</option>
          {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <div className="list-wrap" style={{ marginTop: 12 }}>
        {list.length === 0 && <div className="empty">{lang === "ar" ? "لا توجد سجلات" : "No records"}</div>}
        {list.map((m) => {
          const tone = STATUS_TONE[m.status] || STATUS_TONE.scheduled;
          const od = m.status !== "completed" && m.scheduledDate && D.daysUntil(m.scheduledDate) < 0;
          const soon = m.status !== "completed" && m.scheduledDate && D.daysUntil(m.scheduledDate) >= 0 && D.daysUntil(m.scheduledDate) <= 7;
          return (
            <div key={m.id} className="list-row" style={{ gridTemplateColumns: "1fr auto", alignItems: "center", cursor: m.source === "log" ? "pointer" : "default" }} onClick={() => m.source === "log" && setEditing({ ...blankLog(), ...m })}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }} dir="auto">{m.targetLabel || t.target_facility}</span>
                  <span className="tag" style={{ fontSize: 10.5 }}>{m.maintenanceType === "preventive" ? t.type_preventive : t.type_corrective}</span>
                  <span style={{ fontSize: 10.5, fontWeight: 600, padding: "1px 8px", borderRadius: 999, background: tone.bg, color: tone.fg }}>
                    {t["status_" + m.status]}
                  </span>
                  {od && <span style={{ fontSize: 10.5, color: "var(--hue-urgent)", fontWeight: 600 }}>● {t.overdue_maint}</span>}
                  {soon && <span style={{ fontSize: 10.5, color: "var(--hue-high)", fontWeight: 600 }}>● {t.due_soon}</span>}
                </div>
                <div style={{ fontSize: 12, color: "var(--ink-500)", marginTop: 3, display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {(m.scheduledDate || m.logDate) && <span><Icon name="calendar" size={11} /> {m.scheduledDate || m.logDate}</span>}
                  {m.source === "log" ? (m.supplierId && <span dir="auto">{supplierName(m.supplierId)}</span>) : (m.vendorName && <span dir="auto">{m.vendorName}</span>)}
                  {Number(m.cost) > 0 && <span className="mono">{D.fmtMoney(m.cost)}</span>}
                </div>
              </div>
              <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {m.source === "log" && m.status !== "completed" && (
                  <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => markCompleted(m)}>
                    <Icon name="check" size={12} /> {t.mark_completed}
                  </button>
                )}
                {m.source !== "log" && <span className="tag" style={{ fontSize: 10 }}>{m.targetType === "vehicle" ? t.target_vehicle : t.target_asset}</span>}
                <button className="icon-btn" onClick={() => removeRow(m)} aria-label={lang === "ar" ? "حذف" : "Delete"}><Icon name="trash" size={14} /></button>
              </div>
            </div>
          );
        })}
      </div>

      {editing && (
        <MaintenanceForm
          editing={editing} setEditing={setEditing} t={t} lang={lang}
          vehicles={vehicles} assets={assets} suppliers={suppliers} projects={projects}
          onPickTarget={onPickTarget} setPart={setPart} addPart={addPart} delPart={delPart}
          onSave={saveLog} onDelete={editing.id ? () => { dispatch({ type: "DELETE_MAINT_LOG", id: editing.id }); setEditing(null); } : null}
        />
      )}

      {completing && (
        <SupplierRatingModal
          supplier={suppliers.find((s) => s.id === completing.supplierId)}
          lang={lang}
          onClose={() => setCompleting(null)}
          onSubmit={submitRating}
        />
      )}
    </div>
  );
}

function MaintenanceForm({ editing, setEditing, t, lang, vehicles, assets, suppliers, projects, onPickTarget, setPart, addPart, delPart, onSave, onDelete }) {
  const set = (k, v) => setEditing((e) => ({ ...e, [k]: v }));
  const users = D.getUsers();

  return (
    <div className="modal-mask" onClick={() => setEditing(null)}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-head">
          <div className="h">{editing.id ? t.edit_maintenance : t.new_maintenance}</div>
          <button className="close icon-btn" onClick={() => setEditing(null)} aria-label={t.cancel}><Icon name="x" size={16} /></button>
        </div>
        <div className="modal-body">
          {/* Target type */}
          <div className="type-seg">
            {["vehicle", "asset", "facility"].map((k) => (
              <button key={k} type="button" className={`type-opt ${editing.targetType === k ? "active" : ""}`} onClick={() => setEditing((e) => ({ ...e, targetType: k, targetId: "", targetLabel: "" }))}>
                {t["target_" + k]}
              </button>
            ))}
          </div>
          {/* Target picker */}
          {editing.targetType === "facility" ? (
            <label className="qf-cell">
              <span className="qf-label">{t.facility_name}</span>
              <input className="qf" dir="auto" list="facility-list" value={editing.targetLabel} onChange={(e) => set("targetLabel", e.target.value)} />
              <datalist id="facility-list">{projects.map((p) => <option key={p.id} value={D.projectName(p, lang)} />)}</datalist>
            </label>
          ) : (
            <label className="qf-cell">
              <span className="qf-label">{t.maint_target}</span>
              <select className="qf" value={editing.targetId} onChange={(e) => onPickTarget(editing.targetType, e.target.value)}>
                <option value="">—</option>
                {(editing.targetType === "vehicle" ? vehicles : assets).map((x) => (
                  <option key={x.id} value={x.id}>{editing.targetType === "vehicle" ? (x.name || x.plate || x.id) : (x.name || x.id)}</option>
                ))}
              </select>
            </label>
          )}

          <div className="type-seg">
            {["corrective", "preventive"].map((k) => (
              <button key={k} type="button" className={`type-opt ${editing.maintenanceType === k ? "active" : ""}`} onClick={() => set("maintenanceType", k)}>
                {t["type_" + k]}
              </button>
            ))}
          </div>

          <div className="qf-row">
            <label className="qf-cell"><span className="qf-label">{t.scheduled_date}</span><input type="date" className="qf" value={editing.scheduledDate || ""} onChange={(e) => set("scheduledDate", e.target.value)} /></label>
            <label className="qf-cell"><span className="qf-label">{t.log_date}</span><input type="date" className="qf" value={editing.logDate || ""} onChange={(e) => set("logDate", e.target.value)} /></label>
          </div>

          <label className="qf-cell"><span className="qf-label">{t.work_desc}</span><textarea className="qf" rows={2} dir="auto" value={editing.description} onChange={(e) => set("description", e.target.value)} /></label>

          <div className="qf-row">
            <label className="qf-cell"><span className="qf-label">{t.technician}</span>
              <select className="qf" value={editing.technicianId} onChange={(e) => set("technicianId", e.target.value)}>
                <option value="">—</option>
                {users.map((u) => <option key={u.id} value={u.id}>{D.userName(u, lang)}</option>)}
              </select>
            </label>
            <label className="qf-cell"><span className="qf-label">{t.supplier}</span>
              <select className="qf" value={editing.supplierId} onChange={(e) => set("supplierId", e.target.value)}>
                <option value="">{t.none_external}</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
          </div>

          <div className="qf-row">
            <label className="qf-cell"><span className="qf-label">{t.cost} (SAR)</span><input type="number" inputMode="decimal" className="qf" dir="ltr" value={editing.cost} onChange={(e) => set("cost", e.target.value)} /></label>
            <label className="qf-cell"><span className="qf-label">{t.meter_reading}</span><input type="number" inputMode="numeric" className="qf" dir="ltr" value={editing.meterReading} onChange={(e) => set("meterReading", e.target.value)} /></label>
          </div>

          {/* Status */}
          <label className="qf-cell"><span className="qf-label">{lang === "ar" ? "الحالة" : "Status"}</span>
            <select className="qf" value={editing.status} onChange={(e) => set("status", e.target.value)}>
              <option value="scheduled">{t.status_scheduled}</option>
              <option value="in_progress">{t.status_in_progress}</option>
              <option value="completed">{t.status_completed}</option>
            </select>
          </label>

          {/* Parts */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <span className="qf-label">{t.parts_replaced}</span>
              <button type="button" className="btn btn-ghost" style={{ fontSize: 12 }} onClick={addPart}><Icon name="plus" size={12} /> {t.add_part}</button>
            </div>
            {(editing.partsReplaced || []).map((p, i) => (
              <div key={i} className="qf-row" style={{ gap: 6, marginBottom: 6 }}>
                <input className="qf" placeholder={t.part_name} dir="auto" value={p.name} onChange={(e) => setPart(i, "name", e.target.value)} style={{ flex: 2 }} />
                <input className="qf" placeholder={t.qty} type="number" dir="ltr" value={p.qty} onChange={(e) => setPart(i, "qty", e.target.value)} style={{ width: 64 }} />
                <input className="qf" placeholder={t.cost} type="number" dir="ltr" value={p.cost} onChange={(e) => setPart(i, "cost", e.target.value)} style={{ width: 90 }} />
                <button type="button" className="icon-btn" onClick={() => delPart(i)} aria-label="x"><Icon name="x" size={14} /></button>
              </div>
            ))}
          </div>
        </div>
        <div className="modal-foot" style={{ justifyContent: "space-between" }}>
          {onDelete
            ? <button className="btn btn-ghost" style={{ color: "var(--hue-urgent)" }} onClick={onDelete}><Icon name="trash" size={13} /> {lang === "ar" ? "حذف" : "Delete"}</button>
            : <span />}
          <div style={{ display: "flex", gap: 6 }}>
            <button className="btn btn-ghost" onClick={() => setEditing(null)}>{t.cancel}</button>
            <button className="btn btn-primary" onClick={onSave}><Icon name="check" size={13} /> {t.save}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
