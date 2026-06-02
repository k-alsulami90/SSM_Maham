/* ============================================================
   Mahām · Assets — generic department asset register.
   A Vehicle (fleet.js) is one category of asset; this module
   covers the rest (IT, generators, tools, furniture) on a shared
   spine: project + custodian, documents w/ expiry, maintenance,
   purchase value + warranty. Time-based preventive schedules.
   ============================================================ */
import { TODAY, daysUntil } from "./mock.js";
import { docExpiryState } from "./fleet.js";

export const ASSET_CATEGORY_META = {
  it: { en: "IT & electronics", ar: "تقنية وإلكترونيات", icon: "cpu" },
  generator: { en: "Generators & power", ar: "مولّدات وطاقة", icon: "bolt" },
  tools: { en: "Tools & equipment", ar: "أدوات ومعدّات", icon: "wrench" },
  furniture: { en: "Furniture & fixtures", ar: "أثاث وتجهيزات", icon: "box" },
};

export const ASSET_STATUS_META = {
  in_use: { en: "In use", ar: "قيد الاستخدام", dot: "oklch(0.55 0.075 148)" },
  in_storage: { en: "In storage", ar: "في المخزن", dot: "oklch(0.62 0.090 200)" },
  in_repair: { en: "In repair", ar: "قيد الإصلاح", dot: "oklch(0.70 0.110 70)" },
  retired: { en: "Retired", ar: "مسحوب", dot: "oklch(0.62 0.012 130)" },
};

export const ASSET_DOC_KIND_META = {
  warranty: { en: "Warranty", ar: "ضمان" },
  invoice: { en: "Invoice", ar: "فاتورة" },
  certificate: { en: "Certificate", ar: "شهادة" },
  manual: { en: "Manual", ar: "دليل" },
  other: { en: "Other", ar: "أخرى" },
};

export const ASSET_MAINT_CAT_META = {
  service: { en: "Service", ar: "صيانة" },
  repair: { en: "Repair", ar: "إصلاح" },
  inspection: { en: "Inspection", ar: "فحص" },
  calibration: { en: "Calibration", ar: "معايرة" },
  other: { en: "Other", ar: "أخرى" },
};
export const ASSET_RESETS_SCHEDULE = new Set(["service", "inspection", "calibration"]);

export const ASSETS = [];

// ===== Labels / helpers =====
export const assetName = (a, lang) => (lang === "ar" && a.ar_name ? a.ar_name : a.name);
export const assetLocation = (a, lang) => (lang === "ar" && a.ar_location ? a.ar_location : a.location) || "";
export const assetCategoryLabel = (c, lang) => ASSET_CATEGORY_META[c]?.[lang] || c;
export const assetStatusLabel = (a, lang) => ASSET_STATUS_META[a.status][lang];
export const assetDocKindLabel = (k, lang) => ASSET_DOC_KIND_META[k]?.[lang] || k;
export const assetMaintCatLabel = (c, lang) => ASSET_MAINT_CAT_META[c]?.[lang] || c;

function addMonths(iso, n) {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 10);
}

// Time-based preventive service (no odometer for generic assets).
export function nextServiceTime(a) {
  if (!a.schedule || !a.schedule.everyMonths) return null;
  const dueDate = addMonths(a.schedule.lastServiceDate, a.schedule.everyMonths);
  const daysLeft = daysUntil(dueDate);
  const state = daysLeft < 0 ? "overdue" : daysLeft <= 14 ? "soon" : "ok";
  return { dueDate, daysLeft, state };
}

export function assetCosts(a) {
  return (a.maintenance || []).reduce((s, m) => s + (Number(m.cost) || 0), 0);
}

// Documents nearing/over expiry, across a set of assets.
export function assetExpiringDocs(assets, withinDays = 60) {
  const out = [];
  assets.forEach((a) =>
    (a.documents || []).forEach((d) => {
      if (!d.expires) return;
      const s = docExpiryState(d.expires);
      if (s.state !== "ok" && (s.state === "expired" || s.days <= withinDays)) out.push({ asset: a, doc: d, ...s });
    })
  );
  return out.sort((x, y) => x.days - y.days);
}

export function assetsNeedingService(assets) {
  return assets
    .map((a) => ({ asset: a, svc: nextServiceTime(a) }))
    .filter((x) => x.svc && x.svc.state !== "ok")
    .sort((x, y) => x.svc.daysLeft - y.svc.daysLeft);
}

// Auto tasks: warranty/cert renewals + service-due, de-duped by id.
export function buildAssetTasks(assets) {
  const tasks = [];
  const today = TODAY.toISOString().slice(0, 10);
  assets.forEach((a) => {
    (a.documents || []).forEach((d) => {
      if (!d.expires) return;
      const { state } = docExpiryState(d.expires);
      if (state === "soon" || state === "expired") {
        tasks.push(shell({
          id: `ARENEW-${a.id}-${d.id}`,
          title: `Renew ${ASSET_DOC_KIND_META[d.kind].en} — ${a.name} (${a.tag})`,
          ar_title: `تجديد ${ASSET_DOC_KIND_META[d.kind].ar} — ${a.name} (${a.tag})`,
          desc: `${ASSET_DOC_KIND_META[d.kind].en} expires ${d.expires}.`,
          ar_desc: `تنتهي ${ASSET_DOC_KIND_META[d.kind].ar} بتاريخ ${d.expires}.`,
          project: a.project, assignee: "u1", priority: state === "expired" ? "urgent" : "high",
          due: d.expires, assetId: a.id, created: today,
        }));
      }
    });
    const svc = nextServiceTime(a);
    if (svc && svc.state !== "ok") {
      tasks.push(shell({
        id: `ASVC-${a.id}-${a.schedule.lastServiceDate}`,
        title: `Service due — ${a.name} (${a.tag})`,
        ar_title: `صيانة مستحقة — ${a.name} (${a.tag})`,
        desc: `Preventive service due by ${svc.dueDate}.`,
        ar_desc: `الصيانة الوقائية مستحقة بحلول ${svc.dueDate}.`,
        project: a.project, assignee: a.custodian || "u1", priority: svc.state === "overdue" ? "urgent" : "high",
        due: svc.dueDate, assetId: a.id, created: today,
      }));
    }
  });
  return tasks;
}

function shell(o) {
  return {
    type: "assignment", status: "backlog", progress: 0,
    attachments: [], subtasks: [], quotations: [], selectedQuotationId: null,
    asset: true,
    activity: [{ kind: "system", who: "u1", at: "Today", text: "auto-created from assets", ar: "أُنشئت تلقائياً من الأصول" }],
    ...o,
  };
}
