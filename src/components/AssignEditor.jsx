import { useState } from "react";
import Icon from "./Icon.jsx";
import * as D from "../data/mock.js";
import { I18N } from "../data/i18n.js";

/* Inline project + custodian reassignment for a vehicle or asset. */
export default function AssignEditor({ project, custodian, lang, onSave, onCancel }) {
  const t = I18N[lang];
  const [pr, setPr] = useState(project);
  const [cu, setCu] = useState(custodian);
  return (
    <form className="quote-form" style={{ marginTop: 14 }} onSubmit={(e) => { e.preventDefault(); onSave(pr, cu); }}>
      <div className="qf-row">
        <label className="qf-cell">
          <span className="qf-label">{t.project}</span>
          <select className="qf" value={pr} onChange={(e) => setPr(e.target.value)}>
            {D.getProjects().map((p) => <option key={p.id} value={p.id}>{D.projectName(p, lang)}</option>)}
          </select>
        </label>
        <label className="qf-cell">
          <span className="qf-label">{t.custodian}</span>
          <select className="qf" value={cu} onChange={(e) => setCu(e.target.value)}>
            {D.getUsers().map((u) => <option key={u.id} value={u.id}>{D.userName(u, lang)}</option>)}
          </select>
        </label>
      </div>
      <div className="qf-row" style={{ justifyContent: "flex-end", gap: 6 }}>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>{t.cancel}</button>
        <button type="submit" className="btn btn-primary"><Icon name="check" size={12} /> {t.save}</button>
      </div>
    </form>
  );
}
