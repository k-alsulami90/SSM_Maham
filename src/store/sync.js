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

export const TO_ROW = { tasks: taskToRow, vehicles: vehToRow, assets: assetToRow, recurring_templates: tplToRow, projects: projToRow };

// ----- read everything -----
export async function hydrateAll() {
  try {
    const [tasks, vehicles, assets, templates, projects] = await Promise.all([
      supabase.from("tasks").select("*"),
      supabase.from("vehicles").select("*"),
      supabase.from("assets").select("*"),
      supabase.from("recurring_templates").select("*"),
      supabase.from("projects").select("*"),
    ]);
    const err = tasks.error || vehicles.error || assets.error || templates.error || projects.error;
    if (err) { console.error("[sync] hydrate error:", err.message); return null; }
    return {
      tasks: (tasks.data || []).map(rowToTask),
      vehicles: (vehicles.data || []).map(rowToVeh),
      assets: (assets.data || []).map(rowToAsset),
      templates: (templates.data || []).map(rowToTpl),
      projects: (projects.data || []).map(rowToProj),
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
  ["tasks", "vehicles", "assets", "recurring_templates", "projects"].forEach((tb) => {
    ch.on("postgres_changes", { event: "*", schema: "public", table: tb }, onChange);
  });
  ch.subscribe();
  return () => { try { supabase.removeChannel(ch); } catch { /* ignore */ } };
}
