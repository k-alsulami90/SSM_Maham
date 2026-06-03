import { supabase } from "../lib/supabase.js";

/* Supabase data sync for Stage 2 — shared, live data.
   Rich child objects (subtasks, quotations, fuel logs, etc.) are stored in a
   `data` jsonb column to mirror the app's shapes; the relational columns
   (project, assignee, status…) drive RLS and filtering. All calls are
   defensive so a backend hiccup never takes the app down. */

const isUuid = (s) => typeof s === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
const uuidOrNull = (s) => (isUuid(s) ? s : null);

// ----- mappers (app object ↔ table row) -----
const taskToRow = (t) => {
  const { id, type, title, ar_title, desc, ar_desc, project, priority, status, assignee, due, created, progress, vehicleId, assetId, ...rest } = t;
  return {
    id, type: type || "assignment", title, ar_title, descr: desc, ar_descr: ar_desc,
    project: project || null, priority, status, assignee: uuidOrNull(assignee),
    due: due || null, created: created || null, progress: progress || 0,
    vehicle_id: vehicleId || null, asset_id: assetId || null, data: rest,
  };
};
const rowToTask = (r) => ({
  id: r.id, type: r.type, title: r.title, ar_title: r.ar_title, desc: r.descr, ar_desc: r.ar_descr,
  project: r.project, priority: r.priority, status: r.status, assignee: r.assignee || "",
  due: r.due, created: r.created, progress: r.progress, vehicleId: r.vehicle_id, assetId: r.asset_id,
  ...(r.data || {}),
});

const vehToRow = (v) => { const { id, project, custodian, ...rest } = v; return { id, project: project || null, custodian: uuidOrNull(custodian), data: rest }; };
const rowToVeh = (r) => ({ id: r.id, project: r.project, custodian: r.custodian || "", ...(r.data || {}) });

const assetToRow = (a) => { const { id, category, project, custodian, ...rest } = a; return { id, category, project: project || null, custodian: uuidOrNull(custodian), data: rest }; };
const rowToAsset = (r) => ({ id: r.id, category: r.category, project: r.project, custodian: r.custodian || "", ...(r.data || {}) });

const tplToRow = (x) => { const { id, ...rest } = x; return { id, data: rest }; };
const rowToTpl = (r) => ({ id: r.id, ...(r.data || {}) });

const projToRow = (p) => ({ id: p.id, name: p.name, ar: p.ar });
const rowToProj = (r) => ({ id: r.id, name: r.name, ar: r.ar });

// Suppliers — rating_score/eval_count are maintained by a DB trigger, so we
// never write them back (would clobber the computed value).
const supplierToRow = (s) => ({
  id: s.id, name: s.name, category: s.category || null,
  tax_number: s.taxNumber || null, cr_number: s.crNumber || null,
  contact_name: s.contactName || null, phone: s.phone || null, email: s.email || null,
  payment_terms: s.paymentTerms || null, iban: s.iban || null, contract_url: s.contractUrl || null,
  active: s.active !== false, data: s.data || {},
});
const rowToSupplier = (r) => ({
  id: r.id, name: r.name, category: r.category || "",
  taxNumber: r.tax_number || "", crNumber: r.cr_number || "",
  contactName: r.contact_name || "", phone: r.phone || "", email: r.email || "",
  paymentTerms: r.payment_terms || "", iban: r.iban || "", contractUrl: r.contract_url || "",
  ratingScore: Number(r.rating_score) || 0, evalCount: r.eval_count || 0, active: r.active !== false,
  ...(r.data || {}),
});

const maintToRow = (m) => {
  const { id, targetType, targetId, targetLabel, maintenanceType, logDate, scheduledDate, description,
    technicianId, supplierId, cost, partsReplaced, meterReading, status, createdBy, ...rest } = m;
  return {
    id, target_type: targetType || "asset", target_id: targetId || null, target_label: targetLabel || null,
    maintenance_type: maintenanceType || "corrective", log_date: logDate || null, scheduled_date: scheduledDate || null,
    description: description || null, technician_id: uuidOrNull(technicianId), supplier_id: uuidOrNull(supplierId),
    cost: cost || 0, parts_replaced: partsReplaced || [], meter_reading: meterReading ?? null,
    status: status || "scheduled", created_by: uuidOrNull(createdBy), data: rest,
  };
};
const rowToMaint = (r) => ({
  id: r.id, targetType: r.target_type, targetId: r.target_id || "", targetLabel: r.target_label || "",
  maintenanceType: r.maintenance_type, logDate: r.log_date, scheduledDate: r.scheduled_date,
  description: r.description || "", technicianId: r.technician_id || "", supplierId: r.supplier_id || "",
  cost: Number(r.cost) || 0, partsReplaced: r.parts_replaced || [], meterReading: r.meter_reading,
  status: r.status, createdBy: r.created_by || "", ...(r.data || {}),
});

const evalToRow = (e) => ({
  id: e.id, supplier_id: e.supplierId, maintenance_id: uuidOrNull(e.maintenanceId),
  quality: e.quality, timeliness: e.timeliness, cost: e.cost, service: e.service,
  weighted_score: e.weightedScore, note: e.note || null, created_by: uuidOrNull(e.createdBy),
});
const rowToEval = (r) => ({
  id: r.id, supplierId: r.supplier_id, maintenanceId: r.maintenance_id || "",
  quality: r.quality, timeliness: r.timeliness, cost: r.cost, service: r.service,
  weightedScore: Number(r.weighted_score) || 0, note: r.note || "", createdBy: r.created_by || "",
});

export const TO_ROW = {
  tasks: taskToRow, vehicles: vehToRow, assets: assetToRow, recurring_templates: tplToRow, projects: projToRow,
  suppliers: supplierToRow, maintenance_logs: maintToRow, supplier_evaluations: evalToRow,
};

// ----- read everything -----
export async function hydrateAll() {
  try {
    const [tasks, vehicles, assets, templates, projects, suppliers, maintenance, evaluations] = await Promise.all([
      supabase.from("tasks").select("*"),
      supabase.from("vehicles").select("*"),
      supabase.from("assets").select("*"),
      supabase.from("recurring_templates").select("*"),
      supabase.from("projects").select("*"),
      supabase.from("suppliers").select("*"),
      supabase.from("maintenance_logs").select("*"),
      supabase.from("supplier_evaluations").select("*"),
    ]);
    const err = tasks.error || vehicles.error || assets.error || templates.error || projects.error;
    if (err) { console.error("[sync] hydrate error:", err.message); return null; }
    // suppliers/maintenance are staff-only; members get empty sets (not an error).
    return {
      tasks: (tasks.data || []).map(rowToTask),
      vehicles: (vehicles.data || []).map(rowToVeh),
      assets: (assets.data || []).map(rowToAsset),
      templates: (templates.data || []).map(rowToTpl),
      projects: (projects.data || []).map(rowToProj),
      suppliers: (suppliers.data || []).map(rowToSupplier),
      maintenance: (maintenance.data || []).map(rowToMaint),
      evaluations: (evaluations.data || []).map(rowToEval),
    };
  } catch (e) {
    console.error("[sync] hydrate failed:", e);
    return null;
  }
}

// ----- write a collection (insert new, update changed, delete removed) -----
// IMPORTANT: we must NOT use upsert here. Supabase upsert runs INSERT … ON
// CONFLICT, so RLS evaluates the INSERT policy even for an existing row. Members
// have UPDATE rights on their own tasks but no INSERT policy, so an upsert of a
// task they're just editing gets rejected and their change silently reverts.
// Splitting inserts (new ids) from updates (existing ids) keeps member edits on
// the UPDATE path, which their policy allows.
export async function pushCollection(table, cur, prev, toRow) {
  try {
    const prevById = new Map((prev || []).map((x) => [x.id, x]));
    const changed = cur.filter((x) => prevById.get(x.id) !== x);

    const inserts = changed.filter((x) => !prevById.has(x.id)).map(toRow);
    if (inserts.length) {
      const { error } = await supabase.from(table).insert(inserts);
      if (error) console.error(`[sync] insert ${table}:`, error.message);
    }

    const updates = changed.filter((x) => prevById.has(x.id)).map(toRow);
    for (const row of updates) {
      const { error } = await supabase.from(table).update(row).eq("id", row.id);
      if (error) console.error(`[sync] update ${table}:`, error.message);
    }

    const curIds = new Set(cur.map((x) => x.id));
    const dels = (prev || []).filter((x) => !curIds.has(x.id)).map((x) => x.id);
    if (dels.length) {
      const { error } = await supabase.from(table).delete().in("id", dels);
      if (error) console.error(`[sync] delete ${table}:`, error.message);
    }
  } catch (e) {
    console.error(`[sync] push ${table} failed:`, e);
  }
}

// ----- realtime: any change on shared tables → onChange -----
export function subscribeAll(onChange) {
  const ch = supabase.channel("maham-sync");
  ["tasks", "vehicles", "assets", "recurring_templates", "projects", "suppliers", "maintenance_logs", "supplier_evaluations"].forEach((tb) => {
    ch.on("postgres_changes", { event: "*", schema: "public", table: tb }, onChange);
  });
  ch.subscribe();
  return () => { try { supabase.removeChannel(ch); } catch { /* ignore */ } };
}
