/* ============================================================
   Mahām · Fleet domain — vehicles + maintenance/fuel/document logs.
   Seeded from the real Zimam fleet (May fuel report). Plates hold the
   Arabic letters only — complete the digits in the app. Custodians are
   left unassigned; reassign them in the app. Anchored to demo "today"
   2026-05-28.
   ============================================================ */
import { TODAY, daysUntil, findUser, userName, findProject, projectName } from "./mock.js";
import { FLEET_SEED } from "./vehicles.data.js";

export const VEHICLE_TYPE_META = {
  pickup: { en: "Pickup", ar: "بيك أب" },
  suv: { en: "SUV", ar: "دفع رباعي" },
  van: { en: "Van / Bus", ar: "فان / باص" },
  truck: { en: "Truck", ar: "شاحنة" },
  sedan: { en: "Sedan", ar: "سيدان" },
  equipment: { en: "Equipment", ar: "معدّة" },
};

export const VEHICLE_STATUS_META = {
  active: { en: "Active", ar: "نشط", dot: "oklch(0.55 0.075 148)" },
  in_shop: { en: "In shop", ar: "في الصيانة", dot: "oklch(0.70 0.110 70)" },
  idle: { en: "Idle", ar: "متوقف", dot: "oklch(0.78 0.012 100)" },
  retired: { en: "Retired", ar: "مسحوب", dot: "oklch(0.62 0.012 130)" },
};

export const DOC_KIND_META = {
  registration: { en: "Registration", ar: "استمارة السير" },
  insurance: { en: "Insurance", ar: "تأمين" },
  inspection: { en: "Inspection", ar: "فحص فني" },
  permit: { en: "Permit", ar: "تصريح" },
};

export const MAINT_CAT_META = {
  service: { en: "Service", ar: "صيانة دورية" },
  oil: { en: "Oil change", ar: "تغيير زيت" },
  tires: { en: "Tires", ar: "إطارات" },
  brakes: { en: "Brakes", ar: "فرامل" },
  repair: { en: "Repair", ar: "إصلاح" },
  inspection: { en: "Inspection", ar: "فحص" },
  other: { en: "Other", ar: "أخرى" },
};

// Maintenance categories that reset the preventive schedule.
export const RESETS_SCHEDULE = new Set(["service", "oil"]);

// Helper for building a vehicle from the fuel report. Schedule defaults keep
// "service due" quiet until real intervals are entered in the app.
function veh(o) {
  return {
    status: "active",
    custodian: "",
    year: "",
    purchaseDate: "",
    purchaseValue: 0,
    currency: "SAR",
    documents: [],
    maintenance: [],
    schedule: { everyKm: 10000, everyMonths: 12, lastServiceKm: o.odometer, lastServiceDate: "2026-05-01" },
    ...o,
  };
}

export const VEHICLES = FLEET_SEED.map(veh);

// ===== Labels / lookups =====
export const findVehicle = (vehicles, id) => vehicles.find((v) => v.id === id);
export const vehicleLabel = (v) => `${v.make} ${v.model}`;
export const vehicleTypeLabel = (v, lang) => VEHICLE_TYPE_META[v.type][lang];
export const vehicleStatusLabel = (v, lang) => VEHICLE_STATUS_META[v.status][lang];
export const docKindLabel = (k, lang) => DOC_KIND_META[k][lang];
export const maintCatLabel = (c, lang) => MAINT_CAT_META[c]?.[lang] || c;

// ===== Date helpers =====
function addMonths(iso, n) {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 10);
}

// Document expiry state: expired | soon (<=30d) | warn (<=60d) | ok.
export function docExpiryState(expires) {
  const days = daysUntil(expires);
  if (days < 0) return { state: "expired", days };
  if (days <= 30) return { state: "soon", days };
  if (days <= 60) return { state: "warn", days };
  return { state: "ok", days };
}

// Next preventive service — due by time AND odometer, whichever first.
export function nextService(v) {
  const s = v.schedule;
  const dueKm = s.lastServiceKm + s.everyKm;
  const dueDate = addMonths(s.lastServiceDate, s.everyMonths);
  const kmLeft = dueKm - v.odometer;
  const daysLeft = daysUntil(dueDate);
  const overdue = kmLeft <= 0 || daysLeft < 0;
  const soon = !overdue && (kmLeft <= 500 || daysLeft <= 14);
  return { dueKm, dueDate, kmLeft, daysLeft, state: overdue ? "overdue" : soon ? "soon" : "ok" };
}

// Fuel efficiency (km per liter): distance between first and last fill ÷
// liters added after the first fill (standard tank-to-tank method).
export function fuelEfficiency(v) {
  const fills = [...(v.fuel || [])].sort((a, b) => a.odometer - b.odometer);
  if (fills.length < 2) return null;
  const dist = fills[fills.length - 1].odometer - fills[0].odometer;
  const liters = fills.slice(1).reduce((s, f) => s + (Number(f.liters) || 0), 0);
  if (dist <= 0 || liters <= 0) return null;
  return dist / liters;
}

const inMonth = (iso, ym) => (iso || "").slice(0, 7) === ym;
export function vehicleCosts(v, ym) {
  const m = (v.maintenance || []).filter((x) => !ym || inMonth(x.date, ym)).reduce((s, x) => s + (Number(x.cost) || 0), 0);
  const f = (v.fuel || []).filter((x) => !ym || inMonth(x.date, ym)).reduce((s, x) => s + (Number(x.cost) || 0), 0);
  return { maintenance: m, fuel: f, total: m + f };
}

// Flat list of every document with its vehicle + expiry state, for the dashboard.
export function expiringDocs(vehicles, withinDays = 60) {
  const out = [];
  vehicles.forEach((v) =>
    (v.documents || []).forEach((d) => {
      const s = docExpiryState(d.expires);
      if (s.state !== "ok" && (s.state === "expired" || s.days <= withinDays)) out.push({ vehicle: v, doc: d, ...s });
    })
  );
  return out.sort((a, b) => a.days - b.days);
}

export function vehiclesNeedingService(vehicles) {
  return vehicles
    .map((v) => ({ vehicle: v, svc: nextService(v) }))
    .filter((x) => x.svc.state !== "ok")
    .sort((a, b) => a.svc.daysLeft - b.svc.daysLeft);
}

// ===== Auto-generated tasks (renewals + service-due), de-duped by id =====
export function buildFleetTasks(vehicles) {
  const tasks = [];
  const today = TODAY.toISOString().slice(0, 10);
  vehicles.forEach((v) => {
    (v.documents || []).forEach((d) => {
      const { state } = docExpiryState(d.expires);
      if (state === "soon" || state === "expired") {
        tasks.push(taskShell({
          id: `RENEW-${v.id}-${d.id}`,
          title: `Renew ${DOC_KIND_META[d.kind].en} — ${vehicleLabel(v)} (${v.plate})`,
          ar_title: `تجديد ${DOC_KIND_META[d.kind].ar} — ${vehicleLabel(v)} (${v.plate})`,
          desc: `${DOC_KIND_META[d.kind].en} expires ${d.expires}.`,
          ar_desc: `تنتهي ${DOC_KIND_META[d.kind].ar} بتاريخ ${d.expires}.`,
          project: v.project, assignee: "u1", priority: state === "expired" ? "urgent" : "high",
          due: d.expires, vehicleId: v.id,
          created: today,
        }));
      }
    });
    const svc = nextService(v);
    if (svc.state !== "ok") {
      tasks.push(taskShell({
        id: `SVC-${v.id}-${v.schedule.lastServiceDate}`,
        title: `Service due — ${vehicleLabel(v)} (${v.plate})`,
        ar_title: `صيانة مستحقة — ${vehicleLabel(v)} (${v.plate})`,
        desc: `Preventive service due by ${svc.dueDate} or ${svc.dueKm.toLocaleString()} km.`,
        ar_desc: `الصيانة الوقائية مستحقة بحلول ${svc.dueDate} أو ${svc.dueKm.toLocaleString()} كم.`,
        project: v.project, assignee: v.custodian || "u1", priority: svc.state === "overdue" ? "urgent" : "high",
        due: svc.dueDate, vehicleId: v.id,
        created: today,
      }));
    }
  });
  return tasks;
}

function taskShell(o) {
  return {
    type: "assignment",
    status: "backlog",
    progress: 0,
    attachments: [],
    subtasks: [],
    quotations: [],
    selectedQuotationId: null,
    fleet: true,
    activity: [{ kind: "system", who: "u1", at: "Today", text: "auto-created from fleet", ar: "أُنشئت تلقائياً من الأسطول" }],
    ...o,
  };
}

// Re-export a couple of mock helpers for fleet screens' convenience.
export { findUser, userName, findProject, projectName, daysUntil, TODAY };
