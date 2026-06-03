import { createContext, useContext, useEffect, useMemo, useReducer, useRef } from "react";
import { TASKS, RECURRING_TEMPLATES, genRecurringInstance, periodKey, TODAY, getUsers, setUsers, getProjects, setProjects } from "../data/mock.js";
import { VEHICLES, buildFleetTasks, vehicleLabel } from "../data/fleet.js";
import { ASSETS, buildAssetTasks } from "../data/assets.js";
import { supabase, isSupabaseConfigured } from "../lib/supabase.js";
import { hydrateAll, pushCollection, subscribeAll, TO_ROW } from "./sync.js";
import { useAuth } from "../auth/AuthProvider.jsx";

// Map a Supabase profile row to the user shape the app uses (avatar colour + initials).
const USER_PALETTE = [
  "oklch(0.40 0.060 148)", "oklch(0.58 0.110 32)", "oklch(0.62 0.090 200)",
  "oklch(0.62 0.090 70)", "oklch(0.52 0.090 300)", "oklch(0.55 0.080 250)",
];
const hashIdx = (s, n) => { let h = 0; for (let i = 0; i < String(s).length; i++) h = (h * 31 + String(s).charCodeAt(i)) >>> 0; return h % n; };
function profileToUser(p) {
  const name = p.name || p.username || "User";
  const initials = name.split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";
  return { id: p.id, name, ar: name, role: p.role, initials, color: USER_PALETTE[hashIdx(p.id, USER_PALETTE.length)] };
}

/* ============================================================
   Mahām app store — single source of truth.
   Holds the task "database", recurring-duty templates, and UI
   settings (role, language, accent). Everything flows through
   one reducer and is mirrored to localStorage so the PWA keeps
   data across reloads / offline.
   ============================================================ */

const TASKS_KEY = "maham.tasks.v4";
const TEMPLATES_KEY = "maham.templates.v2";
const VEHICLES_KEY = "maham.vehicles.v3";
const ASSETS_KEY = "maham.assets.v3";
const PROJECTS_KEY = "maham.projects.v1";
const SETTINGS_KEY = "maham.settings.v1";

const DEFAULT_SETTINGS = {
  lang: "ar",          // "en" | "ar" — Arabic by default (toggle still available)
  accent: "forest",    // forest | clay | indigo | slate
  theme: "light",      // light | dark
  uiSize: "m",         // text/zoom size: s | m | l
  role: "manager",     // RBAC: manager | member
  currentUserId: "u1", // manager=u1, member default=u2
};

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return fallback;
}

// Normalize older/seed tasks so every record has the new fields.
const normalizeTask = (t) => ({ type: "assignment", quotations: [], selectedQuotationId: null, ...t });

// Add any missing current-period recurring instances.
function ensureInstances(tasks, templates) {
  const out = [...tasks];
  templates.forEach((tpl) => {
    const inst = genRecurringInstance(tpl);
    if (!out.some((t) => t.id === inst.id)) out.push(inst);
  });
  return out;
}

// Add any missing fleet-derived tasks (doc renewals, service-due), de-duped.
function ensureFleetTasks(tasks, vehicles) {
  const out = [...tasks];
  buildFleetTasks(vehicles).forEach((ft) => {
    if (!out.some((t) => t.id === ft.id)) out.push(ft);
  });
  return out;
}

// Add any missing asset-derived tasks (warranty renewals, service-due).
function ensureAssetTasks(tasks, assets) {
  const out = [...tasks];
  buildAssetTasks(assets).forEach((at) => {
    if (!out.some((t) => t.id === at.id)) out.push(at);
  });
  return out;
}

const isoToday = () => TODAY.toISOString().slice(0, 10);
const isoPlus = (days) => {
  const d = new Date(TODAY);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const ACTION_TEXT = {
  done: { text: "approved", ar: "تمت الموافقة" },
  rejected: { text: "requested changes", ar: "طلب تعديلات" },
  review: { text: "submitted for review", ar: "رفعها للمراجعة" },
  progress: { text: "moved to In Progress", ar: "نقل إلى قيد التنفيذ" },
  backlog: { text: "moved to Backlog", ar: "أُعيدت لقائمة الانتظار" },
};

export function init() {
  const settings = { ...DEFAULT_SETTINGS, ...load(SETTINGS_KEY, {}) };
  const templates = load(TEMPLATES_KEY, RECURRING_TEMPLATES);
  const vehicles = load(VEHICLES_KEY, VEHICLES);
  const assets = load(ASSETS_KEY, ASSETS);
  let tasks = ensureInstances(load(TASKS_KEY, TASKS).map(normalizeTask), templates);
  tasks = ensureFleetTasks(tasks, vehicles);
  tasks = ensureAssetTasks(tasks, assets);
  const projects = load(PROJECTS_KEY, getProjects());
  setProjects(projects);
  return { tasks, templates, vehicles, assets, projects, settings, users: getUsers() };
}

const mapTask = (state, id, fn) => ({
  ...state,
  tasks: state.tasks.map((t) => (t.id === id ? fn(t) : t)),
});

const mapVehicle = (state, id, fn) => ({
  ...state,
  vehicles: state.vehicles.map((v) => (v.id === id ? fn(v) : v)),
});

const mapAsset = (state, id, fn) => ({
  ...state,
  assets: state.assets.map((a) => (a.id === id ? fn(a) : a)),
});

export function reducer(state, action) {
  switch (action.type) {
    case "SET_USERS":
      return { ...state, users: action.users };

    case "HYDRATE": {
      const d = action.data || {};
      return {
        ...state,
        tasks: d.tasks ?? state.tasks,
        vehicles: d.vehicles ?? state.vehicles,
        assets: d.assets ?? state.assets,
        templates: d.templates ?? state.templates,
        projects: d.projects ?? state.projects,
      };
    }

    case "DELETE_TASK":
      return { ...state, tasks: state.tasks.filter((t) => t.id !== action.id) };

    case "SET_SETTING": {
      const settings = { ...state.settings, [action.key]: action.value };
      if (action.key === "role") settings.currentUserId = action.value === "manager" ? "u1" : "u2";
      return { ...state, settings };
    }

    case "SET_STATUS": {
      // logKey lets "reject" move a task back to progress while logging
      // "requested changes" rather than "moved to In Progress".
      const { id, status, actorId, logKey } = action;
      const key = logKey || status;
      const task = state.tasks.find((t) => t.id === id);
      let next = mapTask(state, id, (t) => ({
        ...t,
        status,
        progress: status === "done" ? 100 : t.progress,
        activity: [
          ...(t.activity || []),
          { kind: "system", who: actorId, at: "Today", text: ACTION_TEXT[key]?.text || "updated", ar: ACTION_TEXT[key]?.ar || "حدّث" },
        ],
      }));
      // Completing a recurring instance records the period on its template (streak).
      if (task?.type === "recurring" && status === "done" && task.templateId && task.periodKey) {
        next = {
          ...next,
          templates: next.templates.map((tpl) =>
            tpl.id === task.templateId && !(tpl.history || []).includes(task.periodKey)
              ? { ...tpl, history: [...(tpl.history || []), task.periodKey] }
              : tpl
          ),
        };
      }
      return next;
    }

    case "TOGGLE_SUBTASK": {
      const { id, subtaskId } = action;
      return mapTask(state, id, (t) => {
        const subtasks = (t.subtasks || []).map((s) => (s.id === subtaskId ? { ...s, done: !s.done } : s));
        const total = subtasks.length;
        const doneN = subtasks.filter((s) => s.done).length;
        return { ...t, subtasks, progress: total ? Math.round((doneN / total) * 100) : t.progress };
      });
    }

    case "ADD_SUBTASK":
      return mapTask(state, action.id, (t) => ({
        ...t,
        subtasks: [...(t.subtasks || []), { id: "s" + Date.now(), text: action.text, ar: action.text, done: false }],
      }));

    case "ADD_COMMENT":
      return mapTask(state, action.id, (t) => ({
        ...t,
        activity: [...(t.activity || []), { kind: "msg", who: action.actorId, at: "Just now", text: action.text, ar: action.text }],
      }));

    case "ADD_ATTACHMENTS":
      return mapTask(state, action.id, (t) => ({ ...t, attachments: [...(t.attachments || []), ...action.files] }));

    case "REMOVE_ATTACHMENT":
      return mapTask(state, action.id, (t) => ({ ...t, attachments: (t.attachments || []).filter((a) => a.id !== action.attachmentId) }));

    // ===== Quotations =====
    case "ADD_QUOTATION":
      return mapTask(state, action.id, (t) => ({ ...t, quotations: [...(t.quotations || []), action.quote] }));

    case "REMOVE_QUOTATION":
      return mapTask(state, action.id, (t) => ({
        ...t,
        quotations: (t.quotations || []).filter((q) => q.id !== action.quoteId),
        selectedQuotationId: t.selectedQuotationId === action.quoteId ? null : t.selectedQuotationId,
      }));

    case "SET_RECOMMENDED":
      return mapTask(state, action.id, (t) => ({
        ...t,
        quotations: (t.quotations || []).map((q) => ({ ...q, recommended: q.id === action.quoteId ? !q.recommended : false })),
      }));

    case "SELECT_QUOTATION": {
      const { id, quoteId, reason, actorId } = action;
      return mapTask(state, id, (t) => {
        const q = (t.quotations || []).find((x) => x.id === quoteId);
        const vendor = q?.vendor || "vendor";
        const text = `selected ${vendor}${reason ? ` — ${reason}` : ""}`;
        const ar = `اختار ${q?.ar_vendor || vendor}${reason ? ` — ${reason}` : ""}`;
        return {
          ...t,
          selectedQuotationId: quoteId,
          status: "progress", // member now proceeds with the chosen vendor
          activity: [...(t.activity || []), { kind: "system", who: actorId, at: "Today", text, ar }],
        };
      });
    }

    case "CREATE_TASK":
      return { ...state, tasks: [...state.tasks, action.task] };

    case "UPDATE_TASK":
      return mapTask(state, action.id, (t) => ({ ...t, ...action.patch }));

    case "DELETE_VEHICLE":
      return { ...state, vehicles: state.vehicles.filter((v) => v.id !== action.id) };

    case "DELETE_ASSET":
      return { ...state, assets: state.assets.filter((a) => a.id !== action.id) };

    case "ADD_PROJECT":
      return { ...state, projects: [...state.projects, action.project] };

    case "UPDATE_PROJECT":
      return { ...state, projects: state.projects.map((p) => (p.id === action.id ? { ...p, ...action.patch } : p)) };

    case "DELETE_PROJECT":
      return { ...state, projects: state.projects.filter((p) => p.id !== action.id) };

    // ===== Fleet =====
    case "ADD_FUEL":
      return mapVehicle(state, action.vehicleId, (v) => ({
        ...v,
        fuel: [...(v.fuel || []), action.entry],
        odometer: Math.max(v.odometer, action.entry.odometer || 0),
      }));

    case "ADD_MAINTENANCE":
      return mapVehicle(state, action.vehicleId, (v) => ({
        ...v,
        maintenance: [...(v.maintenance || []), action.entry],
        odometer: Math.max(v.odometer, action.entry.odometer || 0),
        schedule: action.resetsSchedule
          ? { ...v.schedule, lastServiceKm: action.entry.odometer || v.odometer, lastServiceDate: action.entry.date }
          : v.schedule,
      }));

    case "ADD_VEHICLE_DOC":
      return mapVehicle(state, action.vehicleId, (v) => ({ ...v, documents: [...(v.documents || []), action.doc] }));

    case "REMOVE_VEHICLE_DOC":
      return mapVehicle(state, action.vehicleId, (v) => ({ ...v, documents: (v.documents || []).filter((d) => d.id !== action.docId) }));

    case "UPDATE_VEHICLE":
      return mapVehicle(state, action.id, (v) => ({ ...v, ...action.patch }));

    case "ADD_VEHICLE":
      return { ...state, vehicles: [...state.vehicles, action.vehicle] };

    case "REPORT_ISSUE": {
      const v = state.vehicles.find((x) => x.id === action.vehicleId);
      if (!v) return state;
      const label = `${vehicleLabel(v)} (${v.plate})`;
      const task = {
        id: "ISS-" + Date.now().toString(36),
        type: "assignment",
        title: `Issue: ${label}`,
        ar_title: `عطل: ${label}`,
        desc: action.text,
        ar_desc: action.text,
        project: v.project,
        priority: "high",
        assignee: v.custodian || "u1",
        status: "backlog",
        due: isoPlus(3),
        created: isoToday(),
        progress: 0,
        attachments: [],
        subtasks: [],
        quotations: [],
        selectedQuotationId: null,
        vehicleId: v.id,
        fleet: true,
        activity: [{ kind: "msg", who: action.actorId, at: "Just now", text: action.text, ar: action.text }],
      };
      return { ...state, tasks: [...state.tasks, task] };
    }

    // ===== Assets =====
    case "ADD_ASSET":
      return { ...state, assets: [...state.assets, action.asset] };

    case "UPDATE_ASSET":
      return mapAsset(state, action.id, (a) => ({ ...a, ...action.patch }));

    case "ADD_ASSET_MAINTENANCE":
      return mapAsset(state, action.assetId, (a) => ({
        ...a,
        maintenance: [...(a.maintenance || []), action.entry],
        schedule: action.resetsSchedule && a.schedule ? { ...a.schedule, lastServiceDate: action.entry.date } : a.schedule,
      }));

    case "ADD_ASSET_DOC":
      return mapAsset(state, action.assetId, (a) => ({ ...a, documents: [...(a.documents || []), action.doc] }));

    case "REMOVE_ASSET_DOC":
      return mapAsset(state, action.assetId, (a) => ({ ...a, documents: (a.documents || []).filter((d) => d.id !== action.docId) }));

    case "REPORT_ASSET_ISSUE": {
      const a = state.assets.find((x) => x.id === action.assetId);
      if (!a) return state;
      const label = `${a.name} (${a.tag})`;
      const task = {
        id: "AISS-" + Date.now().toString(36),
        type: "assignment",
        title: `Issue: ${label}`,
        ar_title: `عطل: ${label}`,
        desc: action.text,
        ar_desc: action.text,
        project: a.project,
        priority: "high",
        assignee: a.custodian || "u1",
        status: "backlog",
        due: isoPlus(3),
        created: isoToday(),
        progress: 0,
        attachments: [],
        subtasks: [],
        quotations: [],
        selectedQuotationId: null,
        assetId: a.id,
        asset: true,
        activity: [{ kind: "msg", who: action.actorId, at: "Just now", text: action.text, ar: action.text }],
      };
      return { ...state, tasks: [...state.tasks, task] };
    }

    // Restore a task (and optionally templates) to a prior snapshot — powers Undo.
    case "RESTORE_TASK": {
      const out = { ...state, tasks: state.tasks.map((t) => (t.id === action.task.id ? action.task : t)) };
      if (action.templates) out.templates = action.templates;
      return out;
    }

    case "CREATE_TEMPLATE": {
      const tpl = action.template;
      const inst = genRecurringInstance(tpl);
      const tasks = state.tasks.some((t) => t.id === inst.id) ? state.tasks : [...state.tasks, inst];
      return { ...state, templates: [...state.templates, tpl], tasks };
    }

    case "RESET":
      return {
        ...state,
        templates: RECURRING_TEMPLATES,
        vehicles: VEHICLES,
        assets: ASSETS,
        tasks: ensureAssetTasks(ensureFleetTasks(ensureInstances(TASKS.map(normalizeTask), RECURRING_TEMPLATES), VEHICLES), ASSETS),
      };

    default:
      return state;
  }
}

const StoreCtx = createContext(null);

export function AppStoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, init);
  const auth = useAuth();

  // Load the real team from Supabase profiles (replaces the local mock users).
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let off = false;
    supabase
      .from("profiles")
      .select("id, name, username, role, active")
      .then(({ data }) => {
        if (off || !data || !data.length) return;
        const users = data.filter((p) => p.active !== false).map(profileToUser);
        setUsers(users);
        dispatch({ type: "SET_USERS", users });
      });
    return () => { off = true; };
  }, []);

  // ===== Stage 2: shared data sync (hydrate + seed-once + realtime) =====
  const synced = useRef(false);
  const prevRef = useRef(null);
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    // Wait until the signed-in role is known — it gates what we may seed/write.
    if (auth.configured && !auth.role) return;
    // Only staff own the shared fleet/asset/project/task seed; members have no
    // insert rights, so they must never attempt the one-time migration.
    const isStaff = !auth.configured || auth.role === "admin" || auth.role === "manager";
    let cleanup;
    (async () => {
      const d = await hydrateAll();
      if (d) {
        if (isStaff) {
          // One-time migration: seed any empty shared table from current local data.
          if (!d.vehicles.length && state.vehicles.length) { await pushCollection("vehicles", state.vehicles, [], TO_ROW.vehicles); d.vehicles = state.vehicles; }
          if (!d.projects.length && state.projects.length) { await pushCollection("projects", state.projects, [], TO_ROW.projects); d.projects = state.projects; }
          if (!d.tasks.length && state.tasks.length) { await pushCollection("tasks", state.tasks, [], TO_ROW.tasks); d.tasks = state.tasks; }
          if (!d.assets.length && state.assets.length) { await pushCollection("assets", state.assets, [], TO_ROW.assets); d.assets = state.assets; }
          if (!d.templates.length && state.templates.length) { await pushCollection("recurring_templates", state.templates, [], TO_ROW.recurring_templates); d.templates = state.templates; }
        }
        prevRef.current = { tasks: d.tasks, vehicles: d.vehicles, assets: d.assets, templates: d.templates, projects: d.projects };
        dispatch({ type: "HYDRATE", data: d });
      }
      synced.current = true;
      cleanup = subscribeAll(async () => {
        const d2 = await hydrateAll();
        if (d2) {
          prevRef.current = { tasks: d2.tasks, vehicles: d2.vehicles, assets: d2.assets, templates: d2.templates, projects: d2.projects };
          dispatch({ type: "HYDRATE", data: d2 });
        }
      });
    })();
    return () => { if (cleanup) cleanup(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.configured, auth.role]);

  // Write-through: mirror each collection change to Supabase (after first hydrate).
  const pushable = (coll, table, toRow) => {
    if (!isSupabaseConfigured || !synced.current || !prevRef.current) return;
    pushCollection(table, coll, prevRef.current[table === "recurring_templates" ? "templates" : table], toRow);
    prevRef.current[table === "recurring_templates" ? "templates" : table] = coll;
  };
  useEffect(() => { pushable(state.tasks, "tasks", TO_ROW.tasks); }, [state.tasks]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { pushable(state.vehicles, "vehicles", TO_ROW.vehicles); }, [state.vehicles]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { pushable(state.assets, "assets", TO_ROW.assets); }, [state.assets]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { pushable(state.templates, "recurring_templates", TO_ROW.recurring_templates); }, [state.templates]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { pushable(state.projects, "projects", TO_ROW.projects); }, [state.projects]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    try { localStorage.setItem(TASKS_KEY, JSON.stringify(state.tasks)); } catch { /* quota */ }
  }, [state.tasks]);
  useEffect(() => {
    try { localStorage.setItem(TEMPLATES_KEY, JSON.stringify(state.templates)); } catch { /* quota */ }
  }, [state.templates]);
  useEffect(() => {
    try { localStorage.setItem(VEHICLES_KEY, JSON.stringify(state.vehicles)); } catch { /* quota */ }
  }, [state.vehicles]);
  useEffect(() => {
    try { localStorage.setItem(ASSETS_KEY, JSON.stringify(state.assets)); } catch { /* quota */ }
  }, [state.assets]);
  useEffect(() => {
    setProjects(state.projects);
    try { localStorage.setItem(PROJECTS_KEY, JSON.stringify(state.projects)); } catch { /* quota */ }
  }, [state.projects]);
  useEffect(() => {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings)); } catch { /* quota */ }
  }, [state.settings]);

  const value = useMemo(() => ({ ...state, dispatch }), [state]);
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore must be used within AppStoreProvider");
  return ctx;
}

export { periodKey };
