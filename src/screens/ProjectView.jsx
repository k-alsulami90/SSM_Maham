import { useState } from "react";
import Icon from "../components/Icon.jsx";
import Avatar from "../components/Avatar.jsx";
import { PriorityTag, StatusPill } from "../components/Tags.jsx";
import * as D from "../data/mock.js";
import * as F from "../data/fleet.js";
import * as A from "../data/assets.js";
import { I18N } from "../data/i18n.js";
import Disclosure from "../components/Disclosure.jsx";
import { useStore } from "../store/AppStore.jsx";

const catIcon = (cat) => (cat === "vehicle" ? "car" : A.ASSET_CATEGORY_META[cat]?.icon || "box");

/* Project view — everything linked to a project: tasks, vehicles, assets + value. */
export default function ProjectView({ projectId, onOpenTask, onOpenVehicle, onOpenAsset, onBack }) {
  const { tasks, vehicles, assets, settings, dispatch } = useStore();
  const { lang, role } = settings;
  const t = I18N[lang];
  const p = D.findProject(projectId);
  if (!p) return null;

  const [renaming, setRenaming] = useState(null); // string while editing the name
  const saveName = () => {
    const name = (renaming || "").trim();
    if (name) dispatch({ type: "UPDATE_PROJECT", id: projectId, patch: { name, ar: name } });
    setRenaming(null);
  };
  const remove = () => {
    if (window.confirm(`${t.delete}: ${D.projectName(p, lang)}?`)) { dispatch({ type: "DELETE_PROJECT", id: projectId }); onBack?.(); }
  };

  const projTasks = tasks.filter((x) => x.project === projectId);
  const openTasks = projTasks.filter((x) => x.status !== "done");
  const projVehicles = vehicles.filter((v) => v.project === projectId);
  const projAssets = assets.filter((a) => a.project === projectId);
  const assetValue =
    projVehicles.reduce((s, v) => s + (v.purchaseValue || 0), 0) +
    projAssets.reduce((s, a) => s + (a.purchaseValue || 0), 0);

  return (
    <div className="content">
      <div className="page-header">
        <div>
          <h1 className="h" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: D.projectDot(projectId) }} />
            {D.projectName(p, lang)}
          </h1>
          <p className="sub">
            {openTasks.length} {t.open_tasks} · {projVehicles.length} {t.vehicles} · {projAssets.length} {t.assets}
          </p>
        </div>
        {role === "manager" && (
          <div className="actions">
            <button className="btn btn-secondary" onClick={() => setRenaming(D.projectName(p, lang))}><Icon name="settings" size={13} /> {t.rename}</button>
            <button className="btn btn-danger" onClick={remove}><Icon name="trash" size={13} /> {t.delete}</button>
          </div>
        )}
      </div>

      {renaming !== null && (
        <form className="quote-form" style={{ marginBottom: 16 }} onSubmit={(e) => { e.preventDefault(); saveName(); }}>
          <label className="qf-cell">
            <span className="qf-label">{t.rename}</span>
            <input className="qf" dir="auto" autoFocus value={renaming} onChange={(e) => setRenaming(e.target.value)} />
          </label>
          <div className="qf-row" style={{ justifyContent: "flex-end", gap: 6 }}>
            <button type="button" className="btn btn-ghost" onClick={() => setRenaming(null)}>{t.cancel}</button>
            <button type="submit" className="btn btn-primary"><Icon name="check" size={12} /> {t.save}</button>
          </div>
        </form>
      )}

      <div className="metric-grid">
        <div className="metric"><div className="label"><Icon name="hub" size={13} /> {t.open_tasks}</div><div className="value">{openTasks.length}</div></div>
        <div className="metric"><div className="label"><Icon name="car" size={13} /> {t.vehicles}</div><div className="value">{projVehicles.length}</div></div>
        <div className="metric"><div className="label"><Icon name="box" size={13} /> {t.assets}</div><div className="value">{projAssets.length}</div></div>
        <div className="metric"><div className="label"><Icon name="activity" size={13} /> {t.asset_value}</div><div className="value" style={{ fontSize: 18 }}>{D.fmtMoney(assetValue)}</div></div>
      </div>

      {/* Tasks */}
      <Disclosure title={t.task_hub} count={projTasks.length || null} defaultOpen>
        {projTasks.slice(0, 12).map((tk) => {
          const u = D.findUser(tk.assignee);
          return (
            <div key={tk.id} className="list-row" style={{ gridTemplateColumns: "1fr 130px 110px 90px" }} onClick={() => onOpenTask(tk.id)}>
              <div className="ttl"><span className="mono" style={{ color: "var(--ink-300)", fontSize: 11, marginInlineEnd: 8 }}>{tk.id}</span>{D.taskTitle(tk, lang)}<span style={{ marginInlineStart: 8 }}><PriorityTag p={tk.priority} lang={lang} /></span></div>
              <div className="who"><Avatar user={u} size={20} /><span style={{ fontSize: 12.5 }}>{D.userName(u, lang).split(" ")[0]}</span></div>
              <div className="due">{D.dueLabel(tk.due, lang)}</div>
              <div><StatusPill status={tk.status} lang={lang} /></div>
            </div>
          );
        })}
        {projTasks.length === 0 && <div className="empty">{t.no_tasks}</div>}
      </Disclosure>

      {/* Vehicles */}
      {projVehicles.length > 0 && (
        <Disclosure title={t.vehicles} count={projVehicles.length}>
          {projVehicles.map((v) => {
            const u = D.findUser(v.custodian);
            const svc = F.nextService(v);
            return (
              <div key={v.id} className="list-row" style={{ gridTemplateColumns: "1fr 120px 110px 90px" }} onClick={() => onOpenVehicle(v.id)}>
                <div className="ttl" style={{ display: "flex", alignItems: "center", gap: 8 }}><span className="doc-ico" style={{ width: 24, height: 24, color: "var(--ink-500)" }}><Icon name="car" size={14} /></span>{F.vehicleLabel(v)} <span className="mono" style={{ color: "var(--ink-300)", fontSize: 11 }}>{v.plate}</span></div>
                <div className="who"><Avatar user={u} size={20} /><span style={{ fontSize: 12.5 }}>{D.userName(u, lang).split(" ")[0]}</span></div>
                <div className="mono" style={{ fontSize: 12.5 }}>{v.odometer.toLocaleString()} {t.km}</div>
                <div>{svc.state !== "ok" ? <span style={{ fontSize: 11, fontWeight: 600, color: "var(--hue-high)" }}>{t.service_due}</span> : <span className="muted" style={{ fontSize: 11.5 }}>{F.vehicleStatusLabel(v, lang)}</span>}</div>
              </div>
            );
          })}
        </Disclosure>
      )}

      {/* Assets */}
      {projAssets.length > 0 && (
        <Disclosure title={t.assets} count={projAssets.length}>
          {projAssets.map((a) => {
            const u = D.findUser(a.custodian);
            return (
              <div key={a.id} className="list-row" style={{ gridTemplateColumns: "1fr 120px 110px 90px" }} onClick={() => onOpenAsset(a.id)}>
                <div className="ttl" style={{ display: "flex", alignItems: "center", gap: 8 }}><span className="doc-ico" style={{ width: 24, height: 24, color: "var(--ink-500)" }}><Icon name={catIcon(a.category)} size={14} /></span><span dir="auto">{A.assetName(a, lang)}</span> <span className="mono" style={{ color: "var(--ink-300)", fontSize: 11 }}>{a.tag}</span></div>
                <div className="who"><Avatar user={u} size={20} /><span style={{ fontSize: 12.5 }}>{D.userName(u, lang).split(" ")[0]}</span></div>
                <div style={{ fontSize: 12 }}>{A.assetCategoryLabel(a.category, lang)}</div>
                <div className="mono" style={{ fontSize: 12.5 }}>{a.purchaseValue ? D.fmtMoney(a.purchaseValue) : "—"}</div>
              </div>
            );
          })}
        </Disclosure>
      )}
    </div>
  );
}
