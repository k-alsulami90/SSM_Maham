import { useState } from "react";
import Icon from "../components/Icon.jsx";
import Avatar from "../components/Avatar.jsx";
import { Donut } from "../components/DashWidgets.jsx";
import * as D from "../data/mock.js";
import * as F from "../data/fleet.js";
import * as A from "../data/assets.js";
import { I18N } from "../data/i18n.js";
import { useStore } from "../store/AppStore.jsx";
import { useToast } from "../components/Toast.jsx";
import AssignEditor from "../components/AssignEditor.jsx";

const ISO_TODAY = D.TODAY.toISOString().slice(0, 10);
const catIcon = (cat) => (cat === "vehicle" ? "car" : A.ASSET_CATEGORY_META[cat]?.icon || "box");
const catLabel = (cat, lang) => (cat === "vehicle" ? I18N[lang].vehicles : A.assetCategoryLabel(cat, lang));

function ExpiryChip({ state, days, lang, t }) {
  if (!state || state === "ok") return null;
  const map = {
    expired: { color: "var(--hue-urgent)", bg: "var(--hue-urgent-bg)", label: t.expired },
    soon: { color: "var(--hue-high)", bg: "var(--hue-high-bg)", label: `${days}${t.days}` },
    warn: { color: "var(--ink-500)", bg: "var(--bg-sand)", label: `${days}${t.days}` },
  }[state];
  return <span style={{ fontSize: 10.5, fontWeight: 600, color: map.color, background: map.bg, padding: "2px 7px", borderRadius: 999 }}>{map.label}</span>;
}

/* ===================== Assets dashboard (department-wide) ===================== */
export function AssetsDashboard({ onOpenVehicle, onOpenAsset }) {
  const { vehicles, assets, settings } = useStore();
  const { lang } = settings;
  const t = I18N[lang];

  const catCount = { vehicle: vehicles.length };
  const catValue = { vehicle: vehicles.reduce((s, v) => s + (v.purchaseValue || 0), 0) };
  const projValue = {};
  vehicles.forEach((v) => (projValue[v.project] = (projValue[v.project] || 0) + (v.purchaseValue || 0)));
  assets.forEach((a) => {
    catCount[a.category] = (catCount[a.category] || 0) + 1;
    catValue[a.category] = (catValue[a.category] || 0) + (a.purchaseValue || 0);
    projValue[a.project] = (projValue[a.project] || 0) + (a.purchaseValue || 0);
  });
  const totalValue = Object.values(catValue).reduce((s, n) => s + n, 0);
  const totalCount = vehicles.length + assets.length;

  const catColors = { vehicle: "oklch(0.55 0.075 148)", it: "oklch(0.62 0.090 200)", generator: "oklch(0.70 0.110 70)", tools: "oklch(0.52 0.090 300)", furniture: "oklch(0.62 0.060 40)" };
  const catData = Object.keys(catCount).map((c) => ({ s: c, n: catCount[c], color: catColors[c] || "var(--ink-400)", label: catLabel(c, lang) }));

  // Merged expiry alerts (vehicles + assets).
  const expiry = [
    ...F.expiringDocs(vehicles, 60).map((x) => ({ key: x.vehicle.id + x.doc.id, label: F.vehicleLabel(x.vehicle), sub: x.vehicle.plate, kind: F.docKindLabel(x.doc.kind, lang), expires: x.doc.expires, state: x.state, days: x.days, open: () => onOpenVehicle(x.vehicle.id) })),
    ...A.assetExpiringDocs(assets, 60).map((x) => ({ key: x.asset.id + x.doc.id, label: A.assetName(x.asset, lang), sub: x.asset.tag, kind: A.assetDocKindLabel(x.doc.kind, lang), expires: x.doc.expires, state: x.state, days: x.days, open: () => onOpenAsset(x.asset.id) })),
  ].sort((a, b) => a.days - b.days);

  // Merged maintenance due.
  const due = [
    ...F.vehiclesNeedingService(vehicles).map((x) => ({ key: x.vehicle.id, label: F.vehicleLabel(x.vehicle), sub: x.vehicle.plate, state: x.svc.state, info: x.svc.dueDate, open: () => onOpenVehicle(x.vehicle.id) })),
    ...A.assetsNeedingService(assets).map((x) => ({ key: x.asset.id, label: A.assetName(x.asset, lang), sub: x.asset.tag, state: x.svc.state, info: x.svc.dueDate, open: () => onOpenAsset(x.asset.id) })),
  ].sort((a, b) => (a.state === "overdue" ? -1 : 1) - (b.state === "overdue" ? -1 : 1));

  const maxProj = Math.max(1, ...Object.values(projValue));

  return (
    <div className="content dashboard">
      <div className="page-header">
        <div>
          <h1 className="h">{t.assets_dashboard}</h1>
          <p className="sub">{lang === "ar" ? `${totalCount} أصل عبر ${Object.keys(catCount).length} فئات` : `${totalCount} assets across ${Object.keys(catCount).length} categories`}</p>
        </div>
      </div>

      <div className="metric-grid">
        <div className="metric"><div className="label"><Icon name="box" size={13} /> {t.assets}</div><div className="value">{totalCount}</div></div>
        <div className="metric"><div className="label"><Icon name="activity" size={13} /> {t.total_value}</div><div className="value" style={{ fontSize: 22 }}>{D.fmtMoney(totalValue)}</div></div>
        <div className="metric"><div className="label"><Icon name="wrench" size={13} /> {t.maintenance_due}</div><div className="value" style={{ color: due.length ? "var(--hue-high)" : "var(--ink-900)" }}>{due.length}</div></div>
        <div className="metric"><div className="label"><Icon name="shield" size={13} /> {t.expiry_alerts}</div><div className="value" style={{ color: expiry.some((x) => x.state === "expired") ? "var(--hue-urgent)" : "var(--ink-900)" }}>{expiry.length}</div></div>
      </div>

      <div className="dash-split">
        <div className="panel">
          <div className="panel-head"><div><div className="title">{t.expiry_alerts}</div><div className="meta">{lang === "ar" ? "الضمانات والمستندات" : "Warranties & documents"}</div></div></div>
          <div className="queue">
            {expiry.map((e) => (
              <div className="queue-item" key={e.key} onClick={e.open} style={{ cursor: "pointer" }}>
                <div className="ico" style={{ background: e.state === "expired" ? "var(--hue-urgent-bg)" : "var(--hue-high-bg)", color: e.state === "expired" ? "var(--hue-urgent)" : "var(--hue-high)" }}><Icon name="shield" size={14} /></div>
                <div className="body"><div className="title">{e.kind} · {e.label} <span className="mono" style={{ color: "var(--ink-400)", fontSize: 11 }}>{e.sub}</span></div><div className="meta">{t.expires} {e.expires}</div></div>
                <ExpiryChip state={e.state} days={e.days} lang={lang} t={t} />
              </div>
            ))}
            {expiry.length === 0 && <div className="empty">{t.all_good}</div>}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><div><div className="title">{t.by_category}</div></div></div>
          <div className="donut-card">
            <div className="donut"><Donut data={catData} /></div>
            <div className="breakdown">
              {catData.map((d) => (
                <div className="row" key={d.s}>
                  <span className="swatch" style={{ background: d.color }} />
                  <span className="name">{d.label}</span>
                  <span className="num">{d.n} · {D.fmtMoney(catValue[d.s] || 0)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="dash-split" style={{ marginTop: 18 }}>
        <div className="panel">
          <div className="panel-head"><div><div className="title">{t.maintenance_due}</div></div></div>
          <div className="queue">
            {due.map((e) => (
              <div className="queue-item" key={e.key} onClick={e.open} style={{ cursor: "pointer" }}>
                <div className="ico" style={{ background: e.state === "overdue" ? "var(--hue-urgent-bg)" : "var(--hue-high-bg)", color: e.state === "overdue" ? "var(--hue-urgent)" : "var(--hue-high)" }}><Icon name="wrench" size={14} /></div>
                <div className="body"><div className="title">{e.label} <span className="mono" style={{ color: "var(--ink-400)", fontSize: 11 }}>{e.sub}</span></div><div className="meta">{e.state === "overdue" ? t.service_overdue : `${t.due_by} ${e.info}`}</div></div>
              </div>
            ))}
            {due.length === 0 && <div className="empty">{t.none_due}</div>}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><div><div className="title">{t.asset_value} · {t.by_project}</div></div><div className="right mono" style={{ fontSize: 15, fontWeight: 600 }}>{D.fmtMoney(totalValue)}</div></div>
          <div className="workload" style={{ paddingTop: 14 }}>
            {D.getProjects().filter((p) => projValue[p.id]).map((p) => (
              <div className="row" key={p.id} style={{ gridTemplateColumns: "120px 1fr 90px" }}>
                <div className="who"><span style={{ width: 8, height: 8, borderRadius: 2, background: D.projectDot(p.id) }} /><span className="name">{D.projectName(p, lang)}</span></div>
                <div className="bar"><div className="seg done" style={{ width: `${(projValue[p.id] / maxProj) * 100}%`, background: "var(--acc-forest)" }} /></div>
                <div className="total">{D.fmtMoney(projValue[p.id])}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===================== Asset register (assets + vehicles) ===================== */
export function AssetRegister({ onOpenVehicle, onOpenAsset, onNav }) {
  const { vehicles, assets, settings, dispatch } = useStore();
  const { lang, role, currentUserId } = settings;
  const t = I18N[lang];
  const [cat, setCat] = useState(null);
  const [view, setView] = useState("grouped");
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState({});   // expanded item groups

  // Unified rows, with grouping fields (make/model/quantity/location).
  let rows = [
    ...vehicles.map((v) => ({
      id: v.id, kind: "vehicle", category: "vehicle", name: F.vehicleLabel(v), tag: v.plate,
      project: v.project, custodian: v.custodian, value: v.purchaseValue,
      make: v.make || "", model: v.model || "", qty: 1,
      groupLabel: [v.make, v.model].filter(Boolean).join(" ") || F.vehicleLabel(v),
      location: D.projectName(D.findProject(v.project), lang),
      statusLabel: F.vehicleStatusLabel(v, lang), statusDot: F.VEHICLE_STATUS_META[v.status].dot,
      open: () => onOpenVehicle(v.id),
    })),
    ...assets.map((a) => {
      const arName = A.assetName(a, "ar");                       // always Arabic name
      const label = [arName, a.make, a.model].filter(Boolean).join(" ");
      return {
        id: a.id, kind: "asset", category: a.category, name: arName, tag: a.tag,
        project: a.project, custodian: a.custodian, value: a.purchaseValue,
        make: a.make || "", model: a.model || "", qty: a.tracking === "bulk" ? (Number(a.quantity) || 1) : 1,
        groupLabel: label || arName,
        location: A.assetLocation(a, lang) || D.projectName(D.findProject(a.project), lang),
        statusLabel: A.assetStatusLabel(a, lang), statusDot: A.ASSET_STATUS_META[a.status].dot,
        open: () => onOpenAsset(a.id),
      };
    }),
  ];
  if (role === "member") rows = rows.filter((r) => r.custodian === currentUserId);
  if (cat) rows = rows.filter((r) => r.category === cat);

  const totalUnits = rows.reduce((s, r) => s + r.qty, 0);
  const cats = ["vehicle", ...Object.keys(A.ASSET_CATEGORY_META)];

  // Build grouped structure: category → item (make/model/name) → {total, byLoc, items}.
  const groupsByCat = {};
  rows.forEach((r) => {
    const itemKey = (r.groupLabel || r.name || "—").trim();
    (groupsByCat[r.category] = groupsByCat[r.category] || {});
    const g = groupsByCat[r.category][itemKey] || (groupsByCat[r.category][itemKey] = { label: itemKey, total: 0, byLoc: {}, items: [] });
    g.total += r.qty;
    g.byLoc[r.location] = (g.byLoc[r.location] || 0) + r.qty;
    g.items.push(r);
  });
  const cols = "1fr 110px 120px 110px 110px 90px";

  return (
    <div className="content">
      <div className="page-header">
        <div>
          <h1 className="h">{t.asset_register}</h1>
          <p className="sub">{totalUnits} {t.units_count} · {rows.length} {t.assets}</p>
        </div>
        {role === "manager" && (
          <div className="actions">
            <button className="btn btn-secondary" onClick={() => onNav("assets")}><Icon name="gauge" size={13} /> {t.assets_dashboard}</button>
            <button className="btn btn-primary" onClick={() => setAdding(true)}><Icon name="plus" size={13} /> {t.add_asset}</button>
          </div>
        )}
      </div>

      <div className="filters">
        <div className="tabbar">
          <button className={view === "grouped" ? "active" : ""} onClick={() => setView("grouped")}><Icon name="layers" size={11} style={{ marginInlineEnd: 4 }} /> {t.view_grouped}</button>
          <button className={view === "detailed" ? "active" : ""} onClick={() => setView("detailed")}><Icon name="list" size={11} style={{ marginInlineEnd: 4 }} /> {t.view_detailed}</button>
        </div>
        <div className="divider-v" />
        <button className="filter-pill" onClick={() => setCat(null)} style={cat ? {} : { background: "var(--acc-moss-bg)", color: "var(--acc-forest)", borderColor: "var(--acc-moss)" }}>{t.all_categories}</button>
        {cats.map((c) => (
          <button key={c} className="filter-pill" onClick={() => setCat(c)} style={cat === c ? { background: "var(--acc-moss-bg)", color: "var(--acc-forest)", borderColor: "var(--acc-moss)" } : {}}>
            <Icon name={catIcon(c)} size={12} /> {catLabel(c, lang)}
          </button>
        ))}
      </div>

      {/* ---------- Grouped view ---------- */}
      {view === "grouped" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {cats.filter((c) => groupsByCat[c]).map((c) => {
            const items = Object.values(groupsByCat[c]).sort((a, b) => b.total - a.total);
            const catTotal = items.reduce((s, g) => s + g.total, 0);
            return (
              <div className="panel" key={c}>
                <div className="panel-head">
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="doc-ico" style={{ width: 26, height: 26, color: "var(--ink-500)" }}><Icon name={catIcon(c)} size={15} /></span>
                    <div className="title">{catLabel(c, lang)}</div>
                  </div>
                  <div className="right mono" style={{ fontWeight: 700 }}>{catTotal}</div>
                </div>
                <div style={{ padding: "4px 0" }}>
                  {items.map((g) => {
                    const key = c + "|" + g.label;
                    const isOpen = open[key];
                    return (
                      <div key={key}>
                        <button
                          className="group-row"
                          onClick={() => setOpen((o) => ({ ...o, [key]: !o[key] }))}
                          style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", textAlign: "start", borderTop: "1px solid var(--line-soft)" }}
                        >
                          <Icon name={isOpen ? "chev_down" : "chev_right"} size={14} style={{ color: "var(--ink-400)", flexShrink: 0 }} />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: 14 }} dir="auto">{g.label}</div>
                            <div style={{ fontSize: 11.5, color: "var(--ink-500)", marginTop: 2, display: "flex", gap: 8, flexWrap: "wrap" }}>
                              {Object.entries(g.byLoc).map(([loc, n]) => (
                                <span key={loc} dir="auto">{loc} <b className="mono" style={{ color: "var(--ink-700)" }}>{n}</b></span>
                              ))}
                            </div>
                          </div>
                          <span style={{ fontWeight: 700, fontSize: 17, color: "var(--acc-forest)" }} className="mono">×{g.total}</span>
                        </button>
                        {isOpen && (
                          <div style={{ background: "var(--bg-sand)", padding: "2px 0" }}>
                            {g.items.map((r) => {
                              const u = D.findUser(r.custodian);
                              return (
                                <div key={r.id} className="list-row" style={{ gridTemplateColumns: "1fr 90px 100px 90px", paddingInlineStart: 34 }} onClick={r.open}>
                                  <div className="ttl" dir="auto">{r.name}{r.qty > 1 && <span className="mono muted" style={{ fontSize: 11 }}> ×{r.qty}</span>}</div>
                                  <div className="mono" style={{ fontSize: 11.5, color: "var(--ink-500)" }}>{r.tag || "—"}</div>
                                  <div className="who"><Avatar user={u} size={18} /><span style={{ fontSize: 12 }}>{D.userName(u, lang).split(" ")[0]}</span></div>
                                  <div><span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 500, color: "var(--ink-700)" }}><span style={{ width: 7, height: 7, borderRadius: 2, background: r.statusDot }} />{r.statusLabel}</span></div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {rows.length === 0 && <div className="list-wrap"><div className="empty">{t.no_assets}</div></div>}
        </div>
      )}

      {/* ---------- Detailed view ---------- */}
      {view === "detailed" && (
        <div className="list-wrap">
          <div className="list-row header" style={{ gridTemplateColumns: cols }}>
            <span>{t.asset}</span><span>{t.tag}</span><span>{t.project}</span><span>{t.custodian}</span><span>{t.purchase_value}</span><span>{t.filter_status}</span>
          </div>
          {rows.map((r) => {
            const u = D.findUser(r.custodian);
            const p = D.findProject(r.project);
            return (
              <div key={r.id} className="list-row" style={{ gridTemplateColumns: cols }} onClick={r.open}>
                <div className="ttl" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="doc-ico" style={{ width: 26, height: 26, color: "var(--ink-500)" }}><Icon name={catIcon(r.category)} size={15} /></span>
                  <span dir="auto">{r.name}{r.qty > 1 && <span className="mono muted" style={{ fontSize: 11 }}> ×{r.qty}</span>}</span>
                </div>
                <div className="mono" style={{ fontSize: 12, color: "var(--ink-500)" }}>{r.tag}</div>
                <div style={{ fontSize: 12.5 }}><span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: D.projectDot(r.project) }} />{D.projectName(p, lang)}</span></div>
                <div className="who"><Avatar user={u} size={20} /><span style={{ fontSize: 12.5 }}>{D.userName(u, lang).split(" ")[0]}</span></div>
                <div className="mono" style={{ fontSize: 12.5 }}>{r.value ? D.fmtMoney(r.value) : "—"}</div>
                <div><span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 500, color: "var(--ink-700)" }}><span style={{ width: 7, height: 7, borderRadius: 2, background: r.statusDot }} />{r.statusLabel}</span></div>
              </div>
            );
          })}
          {rows.length === 0 && <div className="empty">{t.no_assets}</div>}
        </div>
      )}

      {adding && <AddAssetModal lang={lang} t={t} dispatch={dispatch} onClose={() => setAdding(false)} onOpenAsset={onOpenAsset} />}
    </div>
  );
}

/* Add an asset — individual (serialized) or bulk (a counted quantity). */
function AddAssetModal({ lang, t, dispatch, onClose, onOpenAsset }) {
  const [s, setS] = useState({
    tracking: "unique", name: "", arName: "", category: "it", make: "", model: "",
    project: D.getProjects()[0]?.id || "p1", custodian: "", location: "", tag: "", serial: "",
    quantity: 1, purchaseValue: "", purchaseDate: "", status: "in_use",
  });
  const set = (k, v) => setS((p) => ({ ...p, [k]: v }));
  const isBulk = s.tracking === "bulk";

  const save = () => {
    const fallbackName = [s.make, s.model].filter(Boolean).join(" ").trim();
    if (!s.name.trim() && !fallbackName) return;
    const id = "A-" + Date.now().toString(36);
    dispatch({
      type: "ADD_ASSET",
      asset: {
        id, tag: s.tag.trim(), name: s.name.trim() || fallbackName, ar_name: s.arName.trim(),
        category: s.category, status: s.status, project: s.project, custodian: isBulk ? "" : s.custodian,
        location: s.location.trim(), ar_location: "",
        make: s.make.trim(), model: s.model.trim(), tracking: s.tracking,
        quantity: isBulk ? (Number(s.quantity) || 1) : 1, serial: isBulk ? "" : s.serial.trim(),
        purchaseDate: s.purchaseDate, purchaseValue: Number(s.purchaseValue) || 0, currency: "SAR",
        schedule: null, documents: [], maintenance: [],
      },
    });
    onClose();
    if (!isBulk) onOpenAsset(id);
  };

  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-head">
          <div className="h">{t.add_asset}</div>
          <button className="close icon-btn" onClick={onClose} aria-label={t.cancel}><Icon name="x" size={16} /></button>
        </div>
        <div className="modal-body">
          <div className="type-seg">
            {["unique", "bulk"].map((k) => (
              <button key={k} type="button" className={`type-opt ${s.tracking === k ? "active" : ""}`} onClick={() => set("tracking", k)}>
                {k === "unique" ? t.track_unique : t.track_bulk}
              </button>
            ))}
          </div>
          <div className="qf-row">
            <label className="qf-cell"><span className="qf-label">{t.asset_name_ar}</span><input className="qf" dir="auto" value={s.arName} onChange={(e) => set("arName", e.target.value)} autoFocus /></label>
            <label className="qf-cell"><span className="qf-label">{t.asset_name_en}</span><input className="qf" dir="auto" value={s.name} onChange={(e) => set("name", e.target.value)} /></label>
          </div>
          <div className="qf-row">
            <label className="qf-cell"><span className="qf-label">{t.make}</span><input className="qf" dir="auto" value={s.make} onChange={(e) => set("make", e.target.value)} placeholder="Lenovo / Toyota…" /></label>
            <label className="qf-cell"><span className="qf-label">{t.model}</span><input className="qf" dir="auto" value={s.model} onChange={(e) => set("model", e.target.value)} placeholder='ThinkPad / 75"…' /></label>
          </div>
          <div className="qf-row">
            <label className="qf-cell"><span className="qf-label">{t.category}</span>
              <select className="qf" value={s.category} onChange={(e) => set("category", e.target.value)}>{Object.keys(A.ASSET_CATEGORY_META).map((k) => <option key={k} value={k}>{A.assetCategoryLabel(k, lang)}</option>)}</select>
            </label>
            <label className="qf-cell"><span className="qf-label">{t.location}</span><input className="qf" dir="auto" value={s.location} onChange={(e) => set("location", e.target.value)} /></label>
          </div>
          <div className="qf-row">
            <label className="qf-cell"><span className="qf-label">{t.project}</span>
              <select className="qf" value={s.project} onChange={(e) => set("project", e.target.value)}>{D.getProjects().map((p) => <option key={p.id} value={p.id}>{D.projectName(p, lang)}</option>)}</select>
            </label>
            {isBulk ? (
              <label className="qf-cell"><span className="qf-label">{t.quantity}</span><input className="qf" type="number" inputMode="numeric" dir="ltr" min="1" value={s.quantity} onChange={(e) => set("quantity", e.target.value)} /></label>
            ) : (
              <label className="qf-cell"><span className="qf-label">{t.custodian}</span>
                <select className="qf" value={s.custodian} onChange={(e) => set("custodian", e.target.value)}>
                  <option value="">—</option>
                  {D.getUsers().map((u) => <option key={u.id} value={u.id}>{D.userName(u, lang)}</option>)}
                </select>
              </label>
            )}
          </div>
          {!isBulk && (
            <div className="qf-row">
              <label className="qf-cell"><span className="qf-label">{t.tag} (QR)</span><input className="qf" dir="ltr" value={s.tag} onChange={(e) => set("tag", e.target.value)} /></label>
              <label className="qf-cell"><span className="qf-label">{t.serial_number}</span><input className="qf" dir="ltr" value={s.serial} onChange={(e) => set("serial", e.target.value)} /></label>
            </div>
          )}
          <div className="qf-row">
            <label className="qf-cell"><span className="qf-label">{t.purchase_value} (SAR)</span><input className="qf" type="number" inputMode="decimal" dir="ltr" value={s.purchaseValue} onChange={(e) => set("purchaseValue", e.target.value)} /></label>
            <label className="qf-cell"><span className="qf-label">{t.purchase_date}</span><input className="qf" type="date" value={s.purchaseDate} onChange={(e) => set("purchaseDate", e.target.value)} /></label>
          </div>
        </div>
        <div className="modal-foot" style={{ justifyContent: "flex-end" }}>
          <button className="btn btn-ghost" onClick={onClose}>{t.cancel}</button>
          <button className="btn btn-primary" onClick={save}><Icon name="check" size={13} /> {t.add_asset}</button>
        </div>
      </div>
    </div>
  );
}

/* ===================== Asset (generic) — open by id ===================== */
export function AssetView({ assetId, onBack }) {
  const { assets } = useStore();
  const a = assets.find((x) => x.id === assetId);
  if (!a) return null;
  return <AssetProfile asset={a} onBack={onBack} />;
}

function AssetProfile({ asset: a, onBack }) {
  const { settings, dispatch, maintenance } = useStore();
  const { notify } = useToast();
  const { lang, role, currentUserId } = settings;
  const t = I18N[lang];
  const isManager = role === "manager";
  const u = D.findUser(a.custodian);
  const p = D.findProject(a.project);
  const svc = A.nextServiceTime(a);
  const cost = A.assetCosts(a);
  const warranty = (a.documents || []).map((d) => (d.expires ? { d, ...F.docExpiryState(d.expires) } : null)).filter(Boolean).sort((x, y) => x.days - y.days)[0];
  const [form, setForm] = useState(null);
  const [maintEdit, setMaintEdit] = useState(null);

  return (
    <div className="content">
      <button className="btn btn-ghost" style={{ marginBottom: 12 }} onClick={onBack}><Icon name="chev_left" size={14} /> {t.back}</button>

      <div className="veh-head">
        <div className="veh-ico"><Icon name={catIcon(a.category)} size={26} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="h" style={{ fontSize: 20 }} dir="auto">{A.assetName(a, lang)}</h1>
          <div className="sub" style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginTop: 4 }}>
            <span className="mono">{a.tag}</span>
            <span>{A.assetCategoryLabel(a.category, lang)}</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: A.ASSET_STATUS_META[a.status].dot }} />{A.assetStatusLabel(a, lang)}</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: D.projectDot(a.project) }} />{D.projectName(p, lang)}</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Avatar user={u} size={18} /> {D.userName(u, lang)}</span>
            {A.assetLocation(a, lang) && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="pin" size={13} /> {A.assetLocation(a, lang)}</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {isManager && <button className="btn btn-secondary" onClick={() => setForm(form === "edit" ? null : "edit")}><Icon name="settings" size={13} /> {t.edit_details}</button>}
          {isManager && <button className="btn btn-secondary" onClick={() => setForm(form === "maint" ? null : "maint")}><Icon name="wrench" size={13} /> {t.add_maintenance}</button>}
          {isManager && <button className="btn btn-secondary" onClick={() => setForm(form === "doc" ? null : "doc")}><Icon name="shield" size={13} /> {t.add_document}</button>}
          {isManager && <button className="btn btn-secondary" onClick={() => setForm(form === "assign" ? null : "assign")}><Icon name="pin" size={13} /> {t.reassign}</button>}
          <button className="btn btn-primary" onClick={() => setForm(form === "issue" ? null : "issue")}><Icon name="bell" size={13} /> {t.report_issue}</button>
          {isManager && <button className="btn btn-danger" onClick={() => { if (window.confirm(`${t.delete}: ${A.assetName(a, lang)}?`)) { dispatch({ type: "DELETE_ASSET", id: a.id }); onBack(); } }}><Icon name="trash" size={13} /> {t.delete}</button>}
        </div>
      </div>

      {form === "edit" && (
        <AssetEditForm a={a} lang={lang} t={t} dispatch={dispatch} notify={notify} onDone={() => setForm(null)} />
      )}

      {form === "assign" && (
        <AssignEditor
          project={a.project}
          custodian={a.custodian}
          lang={lang}
          onSave={(project, custodian) => { dispatch({ type: "UPDATE_ASSET", id: a.id, patch: { project, custodian } }); notify(t.toast_logged); setForm(null); }}
          onCancel={() => setForm(null)}
        />
      )}

      <div className="metric-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginTop: 16 }}>
        <div className="metric"><div className="label"><Icon name="activity" size={13} /> {t.purchase_value}</div><div className="value" style={{ fontSize: 18 }}>{a.purchaseValue ? D.fmtMoney(a.purchaseValue) : "—"}</div><div style={{ fontSize: 11.5, color: "var(--ink-500)" }}>{t.purchase_date} {a.purchaseDate || "—"}</div></div>
        <div className="metric"><div className="label"><Icon name="shield" size={13} /> {t.warranty}</div><div className="value" style={{ fontSize: 16 }}>{warranty ? warranty.d.expires : "—"}</div>{warranty && <div style={{ fontSize: 11.5 }}><ExpiryChip state={warranty.state} days={warranty.days} lang={lang} t={t} />{warranty.state === "ok" && <span className="muted">{t.valid_doc}</span>}</div>}</div>
        <div className="metric"><div className="label"><Icon name="wrench" size={13} /> {t.next_service}</div><div className="value" style={{ fontSize: 16 }}>{svc ? svc.dueDate : "—"}</div><div style={{ fontSize: 11.5, color: svc && svc.state !== "ok" ? "var(--hue-high)" : "var(--ink-500)" }}>{svc ? (svc.state === "overdue" ? t.service_overdue : svc.state === "soon" ? t.service_due : t.valid_doc) : "—"}</div></div>
      </div>

      {form && form !== "assign" && form !== "edit" && <AssetForm kind={form} a={a} lang={lang} t={t} me={currentUserId} dispatch={dispatch} notify={notify} onDone={() => setForm(null)} />}
      {maintEdit && <AssetForm kind="maint" a={a} editEntry={maintEdit} lang={lang} t={t} me={currentUserId} dispatch={dispatch} notify={notify} onDone={() => setMaintEdit(null)} />}

      {/* Documents */}
      <div className="panel" style={{ marginTop: 18 }}>
        <div className="panel-head"><div><div className="title">{t.documents}</div></div></div>
        <div style={{ padding: "6px 0" }}>
          {(a.documents || []).map((d) => {
            const ex = d.expires ? F.docExpiryState(d.expires) : null;
            return (
              <div className="list-row" key={d.id} style={{ gridTemplateColumns: "30px 1fr 120px 110px 40px", cursor: "default" }}>
                <span className="doc-ico" style={{ width: 26, height: 26, color: "var(--ink-500)" }}><Icon name="shield" size={14} /></span>
                <div className="ttl">{A.assetDocKindLabel(d.kind, lang)} <span className="mono muted" style={{ fontSize: 11 }}>{d.number}</span></div>
                <div className="mono" style={{ fontSize: 12 }}>{d.expires ? `${t.expires} ${d.expires}` : "—"}</div>
                <div>{ex ? <><ExpiryChip state={ex.state} days={ex.days} lang={lang} t={t} />{ex.state === "ok" && <span className="muted" style={{ fontSize: 11 }}>{t.valid_doc}</span>}</> : <span className="muted" style={{ fontSize: 11 }}>—</span>}</div>
                {isManager ? <button className="icon-btn" onClick={() => dispatch({ type: "REMOVE_ASSET_DOC", assetId: a.id, docId: d.id })} aria-label={t.remove}><Icon name="trash" size={13} /></button> : <span />}
              </div>
            );
          })}
          {(a.documents || []).length === 0 && <div className="empty">{t.no_documents}</div>}
        </div>
      </div>

      {/* Maintenance */}
      <div className="panel" style={{ marginTop: 18 }}>
        <div className="panel-head"><div><div className="title">{t.maintenance}</div></div></div>
        <div style={{ padding: "6px 0" }}>
          {(() => {
            const embedded = (a.maintenance || []).map((m) => ({ key: m.id, embedded: true, raw: m, date: m.date, label: A.assetMaintCatLabel(m.category, lang), vendor: m.vendor, note: lang === "ar" ? m.ar_note : m.note, cost: m.cost, currency: m.currency }));
            const fromHub = maintenance.filter((m) => m.targetType === "asset" && m.targetId === a.id).map((m) => ({ key: "log:" + m.id, date: m.logDate || m.scheduledDate, label: m.maintenanceType === "preventive" ? t.type_preventive : t.type_corrective, vendor: m.vendorName || "", note: m.description, cost: m.cost, currency: "SAR", pending: m.status !== "completed" }));
            const all = [...embedded, ...fromHub].sort((x, y) => new Date(y.date || 0) - new Date(x.date || 0));
            if (!all.length) return <div className="empty">{t.none_due}</div>;
            return all.map((m) => (
              <div className="list-row" key={m.key} style={{ gridTemplateColumns: "100px 1fr 80px auto", cursor: "default", alignItems: "center" }}>
                <div className="mono" style={{ fontSize: 12 }}>{m.date || "—"}</div>
                <div className="ttl" dir="auto">{m.label}{m.vendor ? <span className="muted" style={{ fontSize: 12 }}> · {m.vendor}</span> : ""}{m.note ? <span className="muted" style={{ fontSize: 12 }}> — {m.note}</span> : ""}{m.pending ? <span className="tag" style={{ fontSize: 10, marginInlineStart: 6 }}>{t.status_scheduled}</span> : ""}</div>
                <div className="mono" style={{ fontWeight: 600 }}>{m.cost ? D.fmtMoney(m.cost, m.currency) : "—"}</div>
                <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                  {isManager && m.embedded && (
                    <>
                      <button className="icon-btn" onClick={() => { setForm(null); setMaintEdit(m.raw); }} aria-label={t.edit_details}><Icon name="edit" size={13} /></button>
                      <button className="icon-btn" onClick={() => { if (window.confirm(lang === "ar" ? "حذف سجل الصيانة؟" : "Delete this maintenance record?")) dispatch({ type: "DELETE_ASSET_MAINT", assetId: a.id, entryId: m.raw.id }); }} aria-label={t.delete}><Icon name="trash" size={13} /></button>
                    </>
                  )}
                </div>
              </div>
            ));
          })()}
        </div>
      </div>
    </div>
  );
}

/* Edit an asset's core identity / value / schedule. */
function AssetEditForm({ a, lang, t, dispatch, notify, onDone }) {
  const [s, setS] = useState({
    name: a.name || "", ar_name: a.ar_name || "", tag: a.tag || "", category: a.category || "it",
    status: a.status || "in_use", location: a.location || "", ar_location: a.ar_location || "",
    purchaseValue: a.purchaseValue || "", purchaseDate: a.purchaseDate || "",
    everyMonths: a.schedule?.everyMonths || "",
  });
  const set = (k, v) => setS({ ...s, [k]: v });
  const submit = (e) => {
    e.preventDefault();
    const months = Number(s.everyMonths) || 0;
    dispatch({
      type: "UPDATE_ASSET", id: a.id,
      patch: {
        name: s.name.trim() || a.name, ar_name: s.ar_name.trim(), tag: s.tag.trim(),
        category: s.category, status: s.status, location: s.location.trim(), ar_location: s.ar_location.trim(),
        purchaseValue: Number(s.purchaseValue) || 0, purchaseDate: s.purchaseDate,
        schedule: months > 0 ? { everyMonths: months, lastServiceDate: a.schedule?.lastServiceDate || ISO_TODAY } : null,
      },
    });
    notify(t.toast_logged);
    onDone();
  };
  return (
    <form className="quote-form" style={{ marginTop: 14 }} onSubmit={submit}>
      <div className="qf-row">
        <label className="qf-cell"><span className="qf-label">{lang === "ar" ? "الاسم (إنجليزي)" : "Name"}</span><input className="qf" dir="auto" value={s.name} onChange={(e) => set("name", e.target.value)} /></label>
        <label className="qf-cell"><span className="qf-label">{lang === "ar" ? "الاسم (عربي)" : "Name (Arabic)"}</span><input className="qf" dir="auto" value={s.ar_name} onChange={(e) => set("ar_name", e.target.value)} /></label>
      </div>
      <div className="qf-row">
        <label className="qf-cell"><span className="qf-label">{t.tag}</span><input className="qf" dir="auto" value={s.tag} onChange={(e) => set("tag", e.target.value)} /></label>
        <label className="qf-cell"><span className="qf-label">{t.category}</span>
          <select className="qf" value={s.category} onChange={(e) => set("category", e.target.value)}>{Object.keys(A.ASSET_CATEGORY_META).map((k) => <option key={k} value={k}>{A.assetCategoryLabel(k, lang)}</option>)}</select>
        </label>
      </div>
      <div className="qf-row">
        <label className="qf-cell"><span className="qf-label">{t.filter_status}</span>
          <select className="qf" value={s.status} onChange={(e) => set("status", e.target.value)}>{Object.keys(A.ASSET_STATUS_META).map((k) => <option key={k} value={k}>{A.ASSET_STATUS_META[k][lang]}</option>)}</select>
        </label>
        <label className="qf-cell"><span className="qf-label">{t.location}</span><input className="qf" dir="auto" value={s.location} onChange={(e) => set("location", e.target.value)} /></label>
      </div>
      <div className="qf-row">
        <label className="qf-cell"><span className="qf-label">{t.purchase_value} (SAR)</span><input className="qf" type="number" value={s.purchaseValue} onChange={(e) => set("purchaseValue", e.target.value)} /></label>
        <label className="qf-cell"><span className="qf-label">{t.purchase_date}</span><input className="qf" type="date" value={s.purchaseDate} onChange={(e) => set("purchaseDate", e.target.value)} /></label>
      </div>
      <label className="qf-cell"><span className="qf-label">{t.service_due} ({lang === "ar" ? "كل كم شهر (اختياري)" : "every N months, optional"})</span><input className="qf" type="number" value={s.everyMonths} onChange={(e) => set("everyMonths", e.target.value)} /></label>
      <div className="qf-row" style={{ justifyContent: "flex-end", gap: 6 }}>
        <button type="button" className="btn btn-ghost" onClick={onDone}>{t.cancel}</button>
        <button type="submit" className="btn btn-primary"><Icon name="check" size={12} /> {t.save}</button>
      </div>
    </form>
  );
}

function AssetForm({ kind, a, editEntry, lang, t, me, dispatch, notify, onDone }) {
  const [s, setS] = useState({ date: editEntry?.date || ISO_TODAY, category: editEntry?.category || "service", cost: editEntry?.cost ?? "", vendor: editEntry?.vendor || "", note: editEntry ? (lang === "ar" ? editEntry.ar_note : editEntry.note) || "" : "", reset: true, docKind: "warranty", number: "", issued: ISO_TODAY, expires: "", text: "" });
  const set = (k, v) => setS({ ...s, [k]: v });

  const submit = (e) => {
    e.preventDefault();
    if (kind === "maint") {
      const patch = { date: s.date, category: s.category, cost: Number(s.cost) || 0, currency: "SAR", vendor: s.vendor.trim(), note: s.note.trim(), ar_note: s.note.trim() };
      if (editEntry) dispatch({ type: "UPDATE_ASSET_MAINT", assetId: a.id, entryId: editEntry.id, patch });
      else dispatch({ type: "ADD_ASSET_MAINTENANCE", assetId: a.id, resetsSchedule: s.reset && A.ASSET_RESETS_SCHEDULE.has(s.category), entry: { id: "m" + Date.now(), ...patch } });
      notify(t.toast_logged);
    } else if (kind === "doc") {
      dispatch({ type: "ADD_ASSET_DOC", assetId: a.id, doc: { id: "d" + Date.now(), kind: s.docKind, number: s.number.trim(), issued: s.issued, expires: s.expires, fileName: "" } });
      notify(t.toast_logged);
    } else if (kind === "issue") {
      if (!s.text.trim()) return;
      dispatch({ type: "REPORT_ASSET_ISSUE", assetId: a.id, text: s.text.trim(), actorId: me });
      notify(t.toast_created);
    }
    onDone();
  };

  return (
    <form className="quote-form" style={{ marginTop: 14 }} onSubmit={submit}>
      {kind === "maint" && (
        <>
          <div className="qf-row">
            <label className="qf-cell"><span className="qf-label">{t.date}</span><input className="qf" type="date" value={s.date} onChange={(e) => set("date", e.target.value)} /></label>
            <label className="qf-cell"><span className="qf-label">{t.category}</span>
              <select className="qf" value={s.category} onChange={(e) => set("category", e.target.value)}>{Object.keys(A.ASSET_MAINT_CAT_META).map((c) => <option key={c} value={c}>{A.assetMaintCatLabel(c, lang)}</option>)}</select>
            </label>
          </div>
          <div className="qf-row">
            <label className="qf-cell"><span className="qf-label">{t.cost} (SAR)</span><input className="qf" type="number" value={s.cost} onChange={(e) => set("cost", e.target.value)} /></label>
            <label className="qf-cell"><span className="qf-label">{t.vendor}</span><input className="qf" dir="auto" value={s.vendor} onChange={(e) => set("vendor", e.target.value)} /></label>
          </div>
          <input className="qf" dir="auto" placeholder={t.note_field} value={s.note} onChange={(e) => set("note", e.target.value)} />
          {a.schedule && <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--ink-700)" }}><input type="checkbox" checked={s.reset} onChange={(e) => set("reset", e.target.checked)} /> {t.resets_schedule}</label>}
        </>
      )}
      {kind === "doc" && (
        <>
          <div className="qf-row">
            <label className="qf-cell"><span className="qf-label">{t.documents}</span>
              <select className="qf" value={s.docKind} onChange={(e) => set("docKind", e.target.value)}>{Object.keys(A.ASSET_DOC_KIND_META).map((k) => <option key={k} value={k}>{A.assetDocKindLabel(k, lang)}</option>)}</select>
            </label>
            <label className="qf-cell"><span className="qf-label">{t.doc_number}</span><input className="qf" dir="auto" value={s.number} onChange={(e) => set("number", e.target.value)} /></label>
          </div>
          <div className="qf-row">
            <label className="qf-cell"><span className="qf-label">{t.issued}</span><input className="qf" type="date" value={s.issued} onChange={(e) => set("issued", e.target.value)} /></label>
            <label className="qf-cell"><span className="qf-label">{t.expires}</span><input className="qf" type="date" value={s.expires} onChange={(e) => set("expires", e.target.value)} /></label>
          </div>
        </>
      )}
      {kind === "issue" && <textarea className="qf" dir="auto" rows={3} placeholder={t.issue_ph} value={s.text} onChange={(e) => set("text", e.target.value)} autoFocus />}
      <div className="qf-row" style={{ justifyContent: "flex-end", gap: 6 }}>
        <button type="button" className="btn btn-ghost" onClick={onDone}>{t.cancel}</button>
        <button type="submit" className="btn btn-primary"><Icon name="check" size={12} /> {kind === "maint" ? t.add_maintenance : kind === "doc" ? t.add_document : t.report}</button>
      </div>
    </form>
  );
}
