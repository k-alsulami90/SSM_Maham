import { useState } from "react";
import Icon from "../components/Icon.jsx";
import Avatar from "../components/Avatar.jsx";
import { Donut } from "../components/DashWidgets.jsx";
import * as D from "../data/mock.js";
import * as F from "../data/fleet.js";
import { I18N } from "../data/i18n.js";
import { useStore } from "../store/AppStore.jsx";
import { useToast } from "../components/Toast.jsx";
import AssignEditor from "../components/AssignEditor.jsx";

const CUR_MONTH = D.TODAY.toISOString().slice(0, 10).slice(0, 7);
const ISO_TODAY = D.TODAY.toISOString().slice(0, 10);
const MONTHS = {
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  ar: ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"],
};
const monthLabel = (lang) => MONTHS[lang][Number(CUR_MONTH.slice(5, 7)) - 1];

function StatusPill({ v, lang }) {
  const m = F.VEHICLE_STATUS_META[v.status];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 500, color: "var(--ink-700)" }}>
      <span style={{ width: 7, height: 7, borderRadius: 2, background: m.dot }} />
      {m[lang]}
    </span>
  );
}

function ServiceChip({ svc, lang, t }) {
  if (svc.state === "ok") return <span className="muted" style={{ fontSize: 12 }}>{svc.dueDate}</span>;
  const color = svc.state === "overdue" ? "var(--hue-urgent)" : "var(--hue-high)";
  const bg = svc.state === "overdue" ? "var(--hue-urgent-bg)" : "var(--hue-high-bg)";
  const label = svc.state === "overdue" ? t.service_overdue : t.service_due;
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color, background: bg, padding: "2px 7px", borderRadius: 999, display: "inline-flex", alignItems: "center", gap: 4 }}>
      <Icon name="wrench" size={11} /> {label}
    </span>
  );
}

function DocChip({ state, days, lang, t }) {
  if (state === "ok") return null;
  const map = {
    expired: { color: "var(--hue-urgent)", bg: "var(--hue-urgent-bg)", label: t.expired },
    soon: { color: "var(--hue-high)", bg: "var(--hue-high-bg)", label: `${t.expiring_soon} · ${days}${t.days}` },
    warn: { color: "var(--ink-500)", bg: "var(--bg-sand)", label: `${days}${t.days}` },
  }[state];
  return (
    <span style={{ fontSize: 10.5, fontWeight: 600, color: map.color, background: map.bg, padding: "2px 7px", borderRadius: 999 }}>
      {map.label}
    </span>
  );
}

/* ===================== Fleet dashboard ===================== */
export function FleetDashboard({ onOpenVehicle }) {
  const { vehicles, settings } = useStore();
  const { lang } = settings;
  const t = I18N[lang];

  const total = vehicles.length;
  const active = vehicles.filter((v) => v.status === "active").length;
  const inShop = vehicles.filter((v) => v.status === "in_shop").length;
  const expiring = F.expiringDocs(vehicles, 60);
  const dueSvc = F.vehiclesNeedingService(vehicles);

  const statusData = Object.keys(F.VEHICLE_STATUS_META).map((s) => ({
    s, color: F.VEHICLE_STATUS_META[s].dot, label: F.VEHICLE_STATUS_META[s][lang],
    n: vehicles.filter((v) => v.status === s).length,
  }));

  // Costs this month, total + per project.
  let fuelTot = 0, maintTot = 0;
  const byProject = {};
  vehicles.forEach((v) => {
    const c = F.vehicleCosts(v, CUR_MONTH);
    fuelTot += c.fuel; maintTot += c.maintenance;
    byProject[v.project] = (byProject[v.project] || 0) + c.total;
  });
  const maxProj = Math.max(1, ...Object.values(byProject));

  const eff = vehicles
    .map((v) => ({ v, e: F.fuelEfficiency(v) }))
    .filter((x) => x.e != null)
    .sort((a, b) => b.e - a.e);
  const maxEff = Math.max(1, ...eff.map((x) => x.e));

  return (
    <div className="content dashboard">
      <div className="page-header">
        <div>
          <h1 className="h">{t.fleet_dashboard}</h1>
          <p className="sub">{lang === "ar" ? `${total} مركبة عبر المشاريع` : `${total} vehicles across projects`}</p>
        </div>
      </div>

      <div className="metric-grid">
        <div className="metric"><div className="label"><Icon name="car" size={13} /> {t.vehicles}</div><div className="value">{total}</div></div>
        <div className="metric"><div className="label"><Icon name="gauge" size={13} /> {F.VEHICLE_STATUS_META.active[lang]}</div><div className="value">{active}<span className="unit">/ {total}</span></div></div>
        <div className="metric"><div className="label"><Icon name="wrench" size={13} /> {t.maintenance_due}</div><div className="value" style={{ color: dueSvc.length ? "var(--hue-high)" : "var(--ink-900)" }}>{dueSvc.length}</div></div>
        <div className="metric"><div className="label"><Icon name="shield" size={13} /> {t.expiry_alerts}</div><div className="value" style={{ color: expiring.some((x) => x.state === "expired") ? "var(--hue-urgent)" : "var(--ink-900)" }}>{expiring.length}</div></div>
      </div>

      <div className="dash-split">
        <div className="panel">
          <div className="panel-head"><div><div className="title">{t.expiry_alerts}</div><div className="meta">{lang === "ar" ? "المستندات المنتهية أو قرب الانتهاء" : "Expired or expiring soon"}</div></div></div>
          <div className="queue">
            {expiring.map(({ vehicle, doc, state, days }) => (
              <div className="queue-item" key={vehicle.id + doc.id} onClick={() => onOpenVehicle(vehicle.id)} style={{ cursor: "pointer" }}>
                <div className="ico" style={{ background: state === "expired" ? "var(--hue-urgent-bg)" : "var(--hue-high-bg)", color: state === "expired" ? "var(--hue-urgent)" : "var(--hue-high)" }}><Icon name="shield" size={14} /></div>
                <div className="body">
                  <div className="title">{F.docKindLabel(doc.kind, lang)} · {F.vehicleLabel(vehicle)} <span className="mono" style={{ color: "var(--ink-400)", fontSize: 11 }}>{vehicle.plate}</span></div>
                  <div className="meta">{t.expires} {doc.expires}</div>
                </div>
                <DocChip state={state} days={days} lang={lang} t={t} />
              </div>
            ))}
            {expiring.length === 0 && <div className="empty">{t.all_good}</div>}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><div><div className="title">{t.fleet_status}</div></div></div>
          <div className="donut-card">
            <div className="donut"><Donut data={statusData} /></div>
            <div className="breakdown">
              {statusData.map((d) => (
                <div className="row" key={d.s}>
                  <span className="swatch" style={{ background: d.color }} />
                  <span className="name">{d.label}</span>
                  <span className="num">{d.n}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="dash-split" style={{ marginTop: 18 }}>
        <div className="panel">
          <div className="panel-head"><div><div className="title">{t.maintenance_due}</div><div className="meta">{lang === "ar" ? "حسب الوقت أو المسافة" : "By time or odometer"}</div></div></div>
          <div className="queue">
            {dueSvc.map(({ vehicle, svc }) => (
              <div className="queue-item" key={vehicle.id} onClick={() => onOpenVehicle(vehicle.id)} style={{ cursor: "pointer" }}>
                <div className="ico" style={{ background: svc.state === "overdue" ? "var(--hue-urgent-bg)" : "var(--hue-high-bg)", color: svc.state === "overdue" ? "var(--hue-urgent)" : "var(--hue-high)" }}><Icon name="wrench" size={14} /></div>
                <div className="body">
                  <div className="title">{F.vehicleLabel(vehicle)} <span className="mono" style={{ color: "var(--ink-400)", fontSize: 11 }}>{vehicle.plate}</span></div>
                  <div className="meta">
                    {svc.kmLeft <= 0 ? `${Math.abs(svc.kmLeft).toLocaleString()} ${t.km} ${t.overdue_by}` : `${svc.kmLeft.toLocaleString()} ${t.km}`}
                    {" · "}
                    {svc.daysLeft < 0 ? `${Math.abs(svc.daysLeft)}${t.days} ${t.overdue_by}` : `${t.due_by} ${svc.dueDate}`}
                  </div>
                </div>
                <ServiceChip svc={svc} lang={lang} t={t} />
              </div>
            ))}
            {dueSvc.length === 0 && <div className="empty">{t.none_due}</div>}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <div><div className="title">{t.costs_title}</div></div>
            <div className="right mono" style={{ fontSize: 16, fontWeight: 600 }}>{D.fmtMoney(fuelTot + maintTot)}</div>
          </div>
          <div className="workload" style={{ paddingTop: 14 }}>
            <div style={{ display: "flex", gap: 16, fontSize: 12.5, marginBottom: 6 }}>
              <span><Icon name="fuel" size={12} style={{ verticalAlign: -2, color: "var(--hue-med)" }} /> {t.fuel_cost}: <b className="mono">{D.fmtMoney(fuelTot)}</b></span>
              <span><Icon name="wrench" size={12} style={{ verticalAlign: -2, color: "var(--acc-moss)" }} /> {t.maint_cost}: <b className="mono">{D.fmtMoney(maintTot)}</b></span>
            </div>
            <div className="section-title" style={{ marginTop: 4 }}>{t.by_project}</div>
            {D.getProjects().filter((p) => byProject[p.id]).map((p) => (
              <div className="row" key={p.id} style={{ gridTemplateColumns: "120px 1fr 70px" }}>
                <div className="who"><span style={{ width: 8, height: 8, borderRadius: 2, background: D.projectDot(p.id) }} /><span className="name">{D.projectName(p, lang)}</span></div>
                <div className="bar"><div className="seg done" style={{ width: `${(byProject[p.id] / maxProj) * 100}%`, background: "var(--acc-forest)" }} /></div>
                <div className="total">{D.fmtMoney(byProject[p.id])}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 18 }}>
        <div className="panel-head"><div><div className="title">{t.efficiency}</div><div className="meta">{lang === "ar" ? `متوسط الاستهلاك والتكلفة لكل مركبة (${monthLabel("ar")})` : `Avg consumption & cost per vehicle (${monthLabel("en")})`}</div></div></div>
        <div className="workload" style={{ paddingTop: 14 }}>
          {eff.map(({ v, e }) => {
            const c = F.vehicleCosts(v, CUR_MONTH);
            return (
              <div className="row" key={v.id} onClick={() => onOpenVehicle(v.id)} style={{ gridTemplateColumns: "170px 1fr 70px 90px", cursor: "pointer" }}>
                <div className="who"><Icon name="car" size={14} style={{ color: "var(--ink-400)" }} /><span className="name">{F.vehicleLabel(v)} <span className="mono muted" style={{ fontSize: 11 }}>#{v.internalNo}</span></span></div>
                <div className="bar"><div className="seg prog" style={{ width: `${(e / maxEff) * 100}%` }} /></div>
                <div className="total">{e.toFixed(1)} <span className="muted" style={{ fontSize: 10 }}>{t.km_per_l}</span></div>
                <div className="total mono">{D.fmtMoney(c.fuel)}</div>
              </div>
            );
          })}
          {eff.length === 0 && <div className="empty">—</div>}
        </div>
      </div>
    </div>
  );
}

/* ===================== Vehicles (list + profile) ===================== */
export function Vehicles({ openVehicleId, onOpenVehicle, onBack }) {
  const { vehicles, settings } = useStore();
  if (openVehicleId) {
    const v = vehicles.find((x) => x.id === openVehicleId);
    if (v) return <VehicleProfile vehicle={v} onBack={onBack} />;
  }
  return <VehiclesList vehicles={vehicles} settings={settings} onOpen={onOpenVehicle} />;
}

function VehiclesList({ vehicles, settings, onOpen }) {
  const { dispatch } = useStore();
  const { lang, role, currentUserId } = settings;
  const t = I18N[lang];
  const scope = role === "manager" ? vehicles : vehicles.filter((v) => v.custodian === currentUserId || true);
  const cols = "1fr 120px 110px 110px 130px 90px";
  const [adding, setAdding] = useState(false);

  return (
    <div className="content">
      <div className="page-header">
        <div>
          <h1 className="h">{t.vehicles}</h1>
          <p className="sub">{scope.length} {t.vehicles}</p>
        </div>
        {role === "manager" && (
          <div className="actions">
            <button className="btn btn-primary" onClick={() => setAdding(true)}><Icon name="plus" size={13} /> {t.add_vehicle}</button>
          </div>
        )}
      </div>
      {adding && <VehicleAddModal lang={lang} t={t} dispatch={dispatch} onClose={() => setAdding(false)} onOpen={onOpen} />}
      <div className="list-wrap">
        <div className="list-row header" style={{ gridTemplateColumns: cols }}>
          <span>{t.vehicle}</span><span>{t.project}</span><span>{t.custodian}</span><span>{t.odometer}</span><span>{t.next_service}</span><span>{t.filter_status}</span>
        </div>
        {scope.map((v) => {
          const u = D.findUser(v.custodian);
          const p = D.findProject(v.project);
          const svc = F.nextService(v);
          const worstDoc = F.expiringDocs([v], 60)[0];
          return (
            <div key={v.id} className="list-row" style={{ gridTemplateColumns: cols }} onClick={() => onOpen(v.id)}>
              <div className="ttl" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="doc-ico" style={{ width: 26, height: 26, color: "var(--ink-500)" }}><Icon name="car" size={15} /></span>
                <span>
                  {F.vehicleLabel(v)}{" "}
                  <span className="mono" style={{ color: "var(--ink-500)", fontSize: 11 }} dir="auto">{v.plate}</span>
                  {v.internalNo != null && <span className="mono" style={{ color: "var(--ink-300)", fontSize: 11, marginInlineStart: 6 }}>#{v.internalNo}</span>}
                  {worstDoc && <span style={{ marginInlineStart: 6 }}><DocChip state={worstDoc.state} days={worstDoc.days} lang={lang} t={t} /></span>}
                </span>
              </div>
              <div style={{ fontSize: 12.5 }}><span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: D.projectDot(v.project) }} />{D.projectName(p, lang)}</span></div>
              <div className="who"><Avatar user={u} size={20} /><span style={{ fontSize: 12.5 }}>{D.userName(u, lang).split(" ")[0]}</span></div>
              <div className="mono" style={{ fontSize: 12.5 }}>{v.odometer.toLocaleString()} {t.km}</div>
              <div><ServiceChip svc={svc} lang={lang} t={t} /></div>
              <div><StatusPill v={v} lang={lang} /></div>
            </div>
          );
        })}
        {scope.length === 0 && <div className="empty">{t.no_vehicles}</div>}
      </div>
    </div>
  );
}

/* ----- Add a vehicle (proper form, no blank-stub records) ----- */
function VehicleAddModal({ lang, t, dispatch, onClose, onOpen }) {
  const [s, setS] = useState({ plate: "", make: "", model: "", type: "pickup", fuelType: "diesel", year: "", odometer: 0, project: D.getProjects()[0]?.id || "p1", custodian: "" });
  const set = (k, val) => setS((p) => ({ ...p, [k]: val }));
  const save = () => {
    if (!s.plate.trim() && !s.make.trim()) return;
    const id = "V-" + Date.now().toString(36);
    dispatch({
      type: "ADD_VEHICLE",
      vehicle: {
        id, internalNo: null, plate: s.plate.trim(), make: s.make.trim(), model: s.model.trim(),
        type: s.type, status: "active", project: s.project, custodian: s.custodian, fuelType: s.fuelType,
        odometer: Number(s.odometer) || 0, year: s.year, purchaseDate: "", purchaseValue: 0, currency: "SAR",
        documents: [], maintenance: [], fuel: [],
        schedule: { everyKm: 10000, everyMonths: 12, lastServiceKm: Number(s.odometer) || 0, lastServiceDate: ISO_TODAY },
      },
    });
    onClose();
    onOpen(id);
  };
  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-head"><div className="h">{t.add_vehicle}</div><button className="close icon-btn" onClick={onClose} aria-label={t.cancel}><Icon name="x" size={16} /></button></div>
        <div className="modal-body">
          <div className="qf-row">
            <label className="qf-cell"><span className="qf-label">{t.plate}</span><input className="qf" dir="auto" value={s.plate} onChange={(e) => set("plate", e.target.value)} autoFocus /></label>
            <label className="qf-cell"><span className="qf-label">{t.fuel_type}</span><select className="qf" value={s.fuelType} onChange={(e) => set("fuelType", e.target.value)}><option value="diesel">{lang === "ar" ? "ديزل" : "Diesel"}</option><option value="petrol">{lang === "ar" ? "بنزين" : "Petrol"}</option></select></label>
          </div>
          <div className="qf-row">
            <label className="qf-cell"><span className="qf-label">{t.make}</span><input className="qf" dir="auto" value={s.make} onChange={(e) => set("make", e.target.value)} placeholder="Toyota / Isuzu…" /></label>
            <label className="qf-cell"><span className="qf-label">{t.model}</span><input className="qf" dir="auto" value={s.model} onChange={(e) => set("model", e.target.value)} placeholder="Hilux / D-Max…" /></label>
          </div>
          <div className="qf-row">
            <label className="qf-cell"><span className="qf-label">{t.task_type}</span><select className="qf" value={s.type} onChange={(e) => set("type", e.target.value)}>{Object.keys(F.VEHICLE_TYPE_META).map((k) => <option key={k} value={k}>{F.VEHICLE_TYPE_META[k][lang]}</option>)}</select></label>
            <label className="qf-cell"><span className="qf-label">{t.year}</span><input className="qf" type="number" dir="ltr" value={s.year} onChange={(e) => set("year", e.target.value)} /></label>
          </div>
          <div className="qf-row">
            <label className="qf-cell"><span className="qf-label">{t.project}</span><select className="qf" value={s.project} onChange={(e) => set("project", e.target.value)}>{D.getProjects().map((p) => <option key={p.id} value={p.id}>{D.projectName(p, lang)}</option>)}</select></label>
            <label className="qf-cell"><span className="qf-label">{t.custodian}</span><select className="qf" value={s.custodian} onChange={(e) => set("custodian", e.target.value)}><option value="">—</option>{D.getUsers().map((u) => <option key={u.id} value={u.id}>{D.userName(u, lang)}</option>)}</select></label>
          </div>
          <label className="qf-cell"><span className="qf-label">{t.odometer} ({t.km})</span><input className="qf" type="number" dir="ltr" value={s.odometer} onChange={(e) => set("odometer", e.target.value)} /></label>
        </div>
        <div className="modal-foot" style={{ justifyContent: "flex-end" }}>
          <button className="btn btn-ghost" onClick={onClose}>{t.cancel}</button>
          <button className="btn btn-primary" onClick={save}><Icon name="check" size={13} /> {t.add_vehicle}</button>
        </div>
      </div>
    </div>
  );
}

/* ----- Vehicle profile ----- */
function VehicleProfile({ vehicle: v, onBack }) {
  const { settings, dispatch, maintenance } = useStore();
  const { notify } = useToast();
  const { lang, role, currentUserId } = settings;
  const t = I18N[lang];
  const isManager = role === "manager";
  const u = D.findUser(v.custodian);
  const p = D.findProject(v.project);
  const svc = F.nextService(v);
  const eff = F.fuelEfficiency(v);
  const cost = F.vehicleCosts(v, CUR_MONTH);
  const [form, setForm] = useState(null); // "fuel" | "maint" | "doc" | "issue"
  const [maintEdit, setMaintEdit] = useState(null); // embedded maintenance entry being edited
  const [menu, setMenu] = useState(false);

  // What needs attention now, surfaced at the top so the urgent answer comes first.
  const docStates = (v.documents || []).map((d) => ({ d, ...F.docExpiryState(d.expires) }));
  const alerts = [];
  if (svc.state === "overdue") alerts.push({ tone: "urgent", icon: "wrench", text: t.service_overdue });
  else if (svc.state !== "ok") alerts.push({ tone: "high", icon: "wrench", text: t.service_due });
  docStates.filter((x) => x.state === "expired").forEach((x) => alerts.push({ tone: "urgent", icon: "shield", text: `${F.docKindLabel(x.d.kind, lang)} · ${t.expired}` }));
  docStates.filter((x) => x.state === "soon").forEach((x) => alerts.push({ tone: "high", icon: "shield", text: `${F.docKindLabel(x.d.kind, lang)} · ${x.days}${t.days}` }));
  if (v.status === "in_shop") alerts.push({ tone: "high", icon: "car", text: F.VEHICLE_STATUS_META.in_shop[lang] });

  return (
    <div className="content">
      <button className="btn btn-ghost" style={{ marginBottom: 12 }} onClick={onBack}><Icon name="chev_left" size={14} /> {t.back}</button>

      <div className="veh-head">
        <div className="veh-ico"><Icon name="car" size={26} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="h" style={{ fontSize: 20 }}>{F.vehicleLabel(v)}{v.year ? ` · ${v.year}` : ""}</h1>
          <div className="sub" style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginTop: 4 }}>
            <span className="mono" dir="auto">{v.plate}{v.internalNo != null ? ` · #${v.internalNo}` : ""}</span>
            <StatusPill v={v} lang={lang} />
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: D.projectDot(v.project) }} />{D.projectName(p, lang)}</span>
            {v.custodian
              ? <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Avatar user={u} size={18} /> {D.userName(u, lang)}</span>
              : v.driverNote && <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }} dir="auto"><Icon name="user" size={13} /> {v.driverNote}</span>}
            <span className="mono">{v.odometer.toLocaleString()} {t.km}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-start" }}>
          <button className="btn btn-primary" onClick={() => setForm(form === "issue" ? null : "issue")}><Icon name="bell" size={13} /> {t.report_issue}</button>
          {isManager && <button className="btn btn-secondary" onClick={() => setForm(form === "fuel" ? null : "fuel")}><Icon name="fuel" size={13} /> {t.log_fuel}</button>}
          {isManager && (
            <div style={{ position: "relative" }}>
              <button className="btn btn-secondary" onClick={() => setMenu((m) => !m)} aria-haspopup="true" aria-expanded={menu}>
                <Icon name="more" size={14} /> {lang === "ar" ? "المزيد" : "More"}
              </button>
              {menu && (
                <div className="popover" style={{ top: "calc(100% + 6px)", insetInlineEnd: 0, minWidth: 210 }} onMouseLeave={() => setMenu(false)}>
                  <button className="pop-item" onClick={() => { setMenu(false); setForm("edit"); }}><Icon name="settings" size={15} /> {t.edit_details}</button>
                  <button className="pop-item" onClick={() => { setMenu(false); setForm("maint"); }}><Icon name="wrench" size={15} /> {t.add_maintenance}</button>
                  <button className="pop-item" onClick={() => { setMenu(false); setForm("assign"); }}><Icon name="pin" size={15} /> {t.reassign}</button>
                  <hr />
                  <button className="pop-item" style={{ color: "var(--hue-urgent)" }} onClick={() => { setMenu(false); if (window.confirm(`${t.delete}: ${F.vehicleLabel(v)} (${v.plate})?`)) { dispatch({ type: "DELETE_VEHICLE", id: v.id }); onBack(); } }}><Icon name="trash" size={15} /> {t.delete}</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Needs-attention summary: the urgent answer first. */}
      {alerts.length > 0 ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
          {alerts.map((a, i) => {
            const c = a.tone === "urgent" ? { fg: "var(--hue-urgent)", bg: "var(--hue-urgent-bg)" } : { fg: "var(--hue-high)", bg: "var(--hue-high-bg)" };
            return (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: c.fg, background: c.bg, padding: "6px 12px", borderRadius: 999 }} dir="auto">
                <Icon name={a.icon} size={13} /> {a.text}
              </span>
            );
          })}
        </div>
      ) : (
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 500, color: "var(--hue-low)", background: "var(--hue-low-bg)", padding: "6px 12px", borderRadius: 999, marginTop: 14 }}>
          <Icon name="approve" size={13} /> {t.all_good}
        </div>
      )}

      {form === "assign" && (
        <AssignEditor
          project={v.project}
          custodian={v.custodian}
          lang={lang}
          onSave={(project, custodian) => { dispatch({ type: "UPDATE_VEHICLE", id: v.id, patch: { project, custodian } }); notify(t.toast_logged); setForm(null); }}
          onCancel={() => setForm(null)}
        />
      )}

      {form === "edit" && (
        <VehicleEditForm v={v} lang={lang} t={t} dispatch={dispatch} notify={notify} onDone={() => setForm(null)} />
      )}

      {/* Overview tiles */}
      <div className="metric-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginTop: 16 }}>
        <div className="metric">
          <div className="label"><Icon name="wrench" size={13} /> {t.next_service}</div>
          <div className="value" style={{ fontSize: 16 }}>{svc.dueDate}</div>
          <div style={{ fontSize: 11.5, color: svc.state === "ok" ? "var(--ink-500)" : svc.state === "overdue" ? "var(--hue-urgent)" : "var(--hue-high)" }}>
            {svc.dueKm.toLocaleString()} {t.km} · {svc.kmLeft > 0 ? `${svc.kmLeft.toLocaleString()} ${t.km}` : t.service_overdue}
          </div>
        </div>
        <div className="metric">
          <div className="label"><Icon name="fuel" size={13} /> {t.efficiency}</div>
          <div className="value">{eff ? eff.toFixed(1) : "—"}<span className="unit">{t.km_per_l}</span></div>
        </div>
        <div className="metric">
          <div className="label"><Icon name="activity" size={13} /> {t.costs_title}</div>
          <div className="value" style={{ fontSize: 18 }}>{D.fmtMoney(cost.total)}</div>
          <div style={{ fontSize: 11.5, color: "var(--ink-500)" }}>{t.fuel_cost} {D.fmtMoney(cost.fuel)} · {t.maint_cost} {D.fmtMoney(cost.maintenance)}</div>
        </div>
      </div>

      {form && form !== "assign" && form !== "edit" && <FleetForm kind={form} v={v} lang={lang} t={t} me={currentUserId} dispatch={dispatch} notify={notify} onDone={() => setForm(null)} />}
      {maintEdit && <FleetForm kind="maint" v={v} editEntry={maintEdit} lang={lang} t={t} me={currentUserId} dispatch={dispatch} notify={notify} onDone={() => setMaintEdit(null)} />}

      {/* Documents */}
      <div className="panel" style={{ marginTop: 18 }}>
        <div className="panel-head"><div><div className="title">{t.documents}</div></div>{isManager && <button className="btn btn-ghost right" style={{ fontSize: 12 }} onClick={() => setForm(form === "doc" ? null : "doc")}><Icon name="plus" size={12} /> {t.add_document}</button>}</div>
        <div style={{ padding: "6px 0" }}>
          {(v.documents || []).map((d) => {
            const ex = F.docExpiryState(d.expires);
            return (
              <div className="list-row" key={d.id} style={{ gridTemplateColumns: "30px 1fr 120px 110px 40px", cursor: "default" }}>
                <span className="doc-ico" style={{ width: 26, height: 26, color: "var(--ink-500)" }}><Icon name="shield" size={14} /></span>
                <div className="ttl">{F.docKindLabel(d.kind, lang)} <span className="mono muted" style={{ fontSize: 11 }}>{d.number}</span></div>
                <div className="mono" style={{ fontSize: 12 }}>{t.expires} {d.expires}</div>
                <div><DocChip state={ex.state} days={ex.days} lang={lang} t={t} />{ex.state === "ok" && <span className="muted" style={{ fontSize: 11 }}>{t.valid_doc}</span>}</div>
                {isManager ? (
                  <button className="icon-btn" onClick={() => { if (window.confirm(lang === "ar" ? "حذف المستند؟" : "Remove this document?")) dispatch({ type: "REMOVE_VEHICLE_DOC", vehicleId: v.id, docId: d.id }); }} aria-label={t.remove}><Icon name="trash" size={13} /></button>
                ) : <span />}
              </div>
            );
          })}
          {(v.documents || []).length === 0 && <div className="empty">{t.no_documents}</div>}
        </div>
      </div>

      {/* Maintenance */}
      <div className="panel" style={{ marginTop: 18 }}>
        <div className="panel-head"><div><div className="title">{t.maintenance}</div></div></div>
        <div style={{ padding: "6px 0" }}>
          {(() => {
            // Embedded vehicle logs + standalone hub work-orders targeting this vehicle.
            const embedded = (v.maintenance || []).map((m) => ({ key: m.id, embedded: true, raw: m, date: m.date, label: F.maintCatLabel(m.category, lang), vendor: m.vendor, note: lang === "ar" ? m.ar_note : m.note, odo: m.odometer, cost: m.cost, currency: m.currency }));
            const fromHub = maintenance.filter((m) => m.targetType === "vehicle" && m.targetId === v.id).map((m) => ({ key: "log:" + m.id, date: m.logDate || m.scheduledDate, label: m.maintenanceType === "preventive" ? t.type_preventive : t.type_corrective, vendor: m.vendorName || "", note: m.description, odo: m.meterReading, cost: m.cost, currency: "SAR", pending: m.status !== "completed" }));
            const all = [...embedded, ...fromHub].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
            if (!all.length) return <div className="empty">{lang === "ar" ? "لا توجد سجلات صيانة بعد. أضِف صيانة من زر «المزيد» بالأعلى." : "No maintenance records yet. Add one from the More menu above."}</div>;
            return all.map((m) => (
              <div className="list-row" key={m.key} style={{ gridTemplateColumns: "100px 1fr 90px 80px auto", cursor: "default", alignItems: "center" }}>
                <div className="mono" style={{ fontSize: 12 }}>{m.date || "—"}</div>
                <div className="ttl" dir="auto">{m.label}{m.vendor ? <span className="muted" style={{ fontSize: 12 }}> · {m.vendor}</span> : ""}{m.note ? <span className="muted" style={{ fontSize: 12 }}> — {m.note}</span> : ""}{m.pending ? <span className="tag" style={{ fontSize: 10, marginInlineStart: 6 }}>{t.status_scheduled}</span> : ""}</div>
                <div className="mono muted" style={{ fontSize: 12 }}>{m.odo != null && m.odo !== "" ? `${Number(m.odo).toLocaleString()} ${t.km}` : "—"}</div>
                <div className="mono" style={{ fontWeight: 600 }}>{m.cost ? D.fmtMoney(m.cost, m.currency) : "—"}</div>
                <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                  {isManager && m.embedded && (
                    <>
                      <button className="icon-btn" onClick={() => { setForm(null); setMaintEdit(m.raw); }} aria-label={t.edit_details}><Icon name="edit" size={13} /></button>
                      <button className="icon-btn" onClick={() => { if (window.confirm(lang === "ar" ? "حذف سجل الصيانة؟" : "Delete this maintenance record?")) dispatch({ type: "DELETE_VEH_MAINT", vehicleId: v.id, entryId: m.raw.id }); }} aria-label={t.delete}><Icon name="trash" size={13} /></button>
                    </>
                  )}
                </div>
              </div>
            ));
          })()}
        </div>
      </div>

      {/* Fuel */}
      <div className="panel" style={{ marginTop: 18 }}>
        <div className="panel-head"><div><div className="title">{t.fuel_log}</div></div>{eff && <div className="right mono" style={{ fontSize: 13 }}>{eff.toFixed(1)} {t.km_per_l}</div>}</div>
        <div style={{ padding: "6px 0" }}>
          {[...(v.fuel || [])].sort((a, b) => new Date(b.date) - new Date(a.date)).map((f) => (
            <div className="list-row" key={f.id} style={{ gridTemplateColumns: "110px 1fr 90px 90px 90px", cursor: "default" }}>
              <div className="mono" style={{ fontSize: 12 }}>{f.date}</div>
              <div className="ttl">{f.station}</div>
              <div className="mono muted" style={{ fontSize: 12 }}>{f.odometer.toLocaleString()}</div>
              <div className="mono" style={{ fontSize: 12 }}>{f.liters} L</div>
              <div className="mono" style={{ fontWeight: 600 }}>{D.fmtMoney(f.cost, f.currency)}</div>
            </div>
          ))}
          {(v.fuel || []).length === 0 && <div className="empty">{lang === "ar" ? "لا توجد تعبئات وقود بعد." : "No fuel logs yet."}</div>}
        </div>
      </div>
    </div>
  );
}

/* ----- Edit core vehicle details (plate, identity, odometer, service interval) ----- */
function VehicleEditForm({ v, lang, t, dispatch, notify, onDone }) {
  const [s, setS] = useState({
    plate: v.plate || "",
    make: v.make || "",
    model: v.model || "",
    year: v.year || "",
    type: v.type || "pickup",
    status: v.status || "active",
    fuelType: v.fuelType || "diesel",
    odometer: v.odometer || 0,
    everyKm: v.schedule?.everyKm || 10000,
    everyMonths: v.schedule?.everyMonths || 12,
  });
  const set = (k, val) => setS({ ...s, [k]: val });

  const submit = (e) => {
    e.preventDefault();
    dispatch({
      type: "UPDATE_VEHICLE",
      id: v.id,
      patch: {
        plate: s.plate.trim(),
        make: s.make.trim(),
        model: s.model.trim(),
        year: s.year,
        type: s.type,
        status: s.status,
        fuelType: s.fuelType,
        odometer: Number(s.odometer) || v.odometer,
        schedule: { ...v.schedule, everyKm: Number(s.everyKm) || v.schedule.everyKm, everyMonths: Number(s.everyMonths) || v.schedule.everyMonths },
      },
    });
    notify(t.toast_logged);
    onDone();
  };

  return (
    <form className="quote-form" style={{ marginTop: 14 }} onSubmit={submit}>
      <div className="qf-row">
        <label className="qf-cell"><span className="qf-label">{t.plate}</span><input className="qf" dir="auto" value={s.plate} onChange={(e) => set("plate", e.target.value)} /></label>
        <label className="qf-cell"><span className="qf-label">{t.fuel_type}</span>
          <select className="qf" value={s.fuelType} onChange={(e) => set("fuelType", e.target.value)}>
            <option value="diesel">{lang === "ar" ? "ديزل" : "Diesel"}</option>
            <option value="petrol">{lang === "ar" ? "بنزين" : "Petrol"}</option>
          </select>
        </label>
      </div>
      <div className="qf-row">
        <label className="qf-cell"><span className="qf-label">{t.make}</span><input className="qf" dir="auto" value={s.make} onChange={(e) => set("make", e.target.value)} /></label>
        <label className="qf-cell"><span className="qf-label">{t.model}</span><input className="qf" dir="auto" value={s.model} onChange={(e) => set("model", e.target.value)} /></label>
      </div>
      <div className="qf-row">
        <label className="qf-cell"><span className="qf-label">{t.year}</span><input className="qf" type="number" value={s.year} onChange={(e) => set("year", e.target.value)} /></label>
        <label className="qf-cell"><span className="qf-label">{t.odometer} ({t.km})</span><input className="qf" type="number" value={s.odometer} onChange={(e) => set("odometer", e.target.value)} /></label>
      </div>
      <div className="qf-row">
        <label className="qf-cell"><span className="qf-label">{t.task_type}</span>
          <select className="qf" value={s.type} onChange={(e) => set("type", e.target.value)}>
            {Object.keys(F.VEHICLE_TYPE_META).map((k) => <option key={k} value={k}>{F.VEHICLE_TYPE_META[k][lang]}</option>)}
          </select>
        </label>
        <label className="qf-cell"><span className="qf-label">{t.filter_status}</span>
          <select className="qf" value={s.status} onChange={(e) => set("status", e.target.value)}>
            {Object.keys(F.VEHICLE_STATUS_META).map((k) => <option key={k} value={k}>{F.VEHICLE_STATUS_META[k][lang]}</option>)}
          </select>
        </label>
      </div>
      <div className="qf-row">
        <label className="qf-cell"><span className="qf-label">{t.service_due} ({t.km})</span><input className="qf" type="number" value={s.everyKm} onChange={(e) => set("everyKm", e.target.value)} /></label>
        <label className="qf-cell"><span className="qf-label">{t.service_due} ({lang === "ar" ? "أشهر" : "months"})</span><input className="qf" type="number" value={s.everyMonths} onChange={(e) => set("everyMonths", e.target.value)} /></label>
      </div>
      <div className="qf-row" style={{ justifyContent: "flex-end", gap: 6 }}>
        <button type="button" className="btn btn-ghost" onClick={onDone}>{t.cancel}</button>
        <button type="submit" className="btn btn-primary"><Icon name="check" size={12} /> {t.save}</button>
      </div>
    </form>
  );
}

/* ----- Inline add forms (fuel / maintenance / document / issue) ----- */
function FleetForm({ kind, v, editEntry, lang, t, me, dispatch, notify, onDone }) {
  const [s, setS] = useState({
    date: editEntry?.date || ISO_TODAY,
    odometer: editEntry?.odometer ?? v.odometer,
    liters: "",
    cost: editEntry?.cost ?? "",
    station: "",
    category: editEntry?.category || "service",
    vendor: editEntry?.vendor || "",
    note: editEntry ? (lang === "ar" ? editEntry.ar_note : editEntry.note) || "" : "",
    reset: true,
    docKind: "registration",
    number: "",
    issued: ISO_TODAY,
    expires: "",
    text: "",
  });
  const set = (k, val) => setS({ ...s, [k]: val });

  const submit = (e) => {
    e.preventDefault();
    if (kind === "fuel") {
      dispatch({ type: "ADD_FUEL", vehicleId: v.id, entry: { id: "f" + Date.now(), date: s.date, odometer: Number(s.odometer) || v.odometer, liters: Number(s.liters) || 0, cost: Number(s.cost) || 0, currency: "SAR", station: s.station.trim() } });
      notify(t.toast_logged);
    } else if (kind === "maint") {
      const patch = { date: s.date, odometer: Number(s.odometer) || v.odometer, category: s.category, cost: Number(s.cost) || 0, currency: "SAR", vendor: s.vendor.trim(), note: s.note.trim(), ar_note: s.note.trim() };
      if (editEntry) dispatch({ type: "UPDATE_VEH_MAINT", vehicleId: v.id, entryId: editEntry.id, patch });
      else dispatch({ type: "ADD_MAINTENANCE", vehicleId: v.id, resetsSchedule: s.reset, entry: { id: "m" + Date.now(), ...patch } });
      notify(t.toast_logged);
    } else if (kind === "doc") {
      if (!s.expires) return;
      dispatch({ type: "ADD_VEHICLE_DOC", vehicleId: v.id, doc: { id: "d" + Date.now(), kind: s.docKind, number: s.number.trim(), issued: s.issued, expires: s.expires, fileName: "" } });
      notify(t.toast_logged);
    } else if (kind === "issue") {
      if (!s.text.trim()) return;
      dispatch({ type: "REPORT_ISSUE", vehicleId: v.id, text: s.text.trim(), actorId: me });
      notify(t.toast_created);
    }
    onDone();
  };

  return (
    <form className="quote-form" style={{ marginTop: 14 }} onSubmit={submit}>
      {kind === "fuel" && (
        <>
          <div className="qf-row">
            <label className="qf-cell"><span className="qf-label">{t.date}</span><input className="qf" type="date" value={s.date} onChange={(e) => set("date", e.target.value)} /></label>
            <label className="qf-cell"><span className="qf-label">{t.odometer}</span><input className="qf" type="number" value={s.odometer} onChange={(e) => set("odometer", e.target.value)} /></label>
          </div>
          <div className="qf-row">
            <label className="qf-cell"><span className="qf-label">{t.liters}</span><input className="qf" type="number" value={s.liters} onChange={(e) => set("liters", e.target.value)} /></label>
            <label className="qf-cell"><span className="qf-label">{t.cost} (SAR)</span><input className="qf" type="number" value={s.cost} onChange={(e) => set("cost", e.target.value)} /></label>
          </div>
          <input className="qf" dir="auto" placeholder={t.station} value={s.station} onChange={(e) => set("station", e.target.value)} />
        </>
      )}

      {kind === "maint" && (
        <>
          <div className="qf-row">
            <label className="qf-cell"><span className="qf-label">{t.date}</span><input className="qf" type="date" value={s.date} onChange={(e) => set("date", e.target.value)} /></label>
            <label className="qf-cell"><span className="qf-label">{t.odometer}</span><input className="qf" type="number" value={s.odometer} onChange={(e) => set("odometer", e.target.value)} /></label>
          </div>
          <div className="qf-row">
            <label className="qf-cell"><span className="qf-label">{t.category}</span>
              <select className="qf" value={s.category} onChange={(e) => set("category", e.target.value)}>
                {Object.keys(F.MAINT_CAT_META).map((c) => <option key={c} value={c}>{F.maintCatLabel(c, lang)}</option>)}
              </select>
            </label>
            <label className="qf-cell"><span className="qf-label">{t.cost} (SAR)</span><input className="qf" type="number" value={s.cost} onChange={(e) => set("cost", e.target.value)} /></label>
          </div>
          <input className="qf" dir="auto" placeholder={t.vendor} value={s.vendor} onChange={(e) => set("vendor", e.target.value)} />
          <input className="qf" dir="auto" placeholder={t.note_field} value={s.note} onChange={(e) => set("note", e.target.value)} />
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--ink-700)" }}>
            <input type="checkbox" checked={s.reset} onChange={(e) => set("reset", e.target.checked)} /> {t.resets_schedule}
          </label>
        </>
      )}

      {kind === "doc" && (
        <>
          <div className="qf-row">
            <label className="qf-cell"><span className="qf-label">{t.documents}</span>
              <select className="qf" value={s.docKind} onChange={(e) => set("docKind", e.target.value)}>
                {Object.keys(F.DOC_KIND_META).map((k) => <option key={k} value={k}>{F.docKindLabel(k, lang)}</option>)}
              </select>
            </label>
            <label className="qf-cell"><span className="qf-label">{t.doc_number}</span><input className="qf" dir="auto" value={s.number} onChange={(e) => set("number", e.target.value)} /></label>
          </div>
          <div className="qf-row">
            <label className="qf-cell"><span className="qf-label">{t.issued}</span><input className="qf" type="date" value={s.issued} onChange={(e) => set("issued", e.target.value)} /></label>
            <label className="qf-cell"><span className="qf-label">{t.expires}</span><input className="qf" type="date" value={s.expires} onChange={(e) => set("expires", e.target.value)} required /></label>
          </div>
        </>
      )}

      {kind === "issue" && (
        <textarea className="qf" dir="auto" rows={3} placeholder={t.issue_ph} value={s.text} onChange={(e) => set("text", e.target.value)} autoFocus />
      )}

      <div className="qf-row" style={{ justifyContent: "flex-end", gap: 6 }}>
        <button type="button" className="btn btn-ghost" onClick={onDone}>{t.cancel}</button>
        <button type="submit" className="btn btn-primary">
          <Icon name="check" size={12} />{" "}
          {kind === "fuel" ? t.log_fuel : kind === "maint" ? t.add_maintenance : kind === "doc" ? t.add_document : t.report}
        </button>
      </div>
    </form>
  );
}
