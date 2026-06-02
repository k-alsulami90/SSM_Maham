/* ============================================================
   Mahām — mock domain data + helpers
   Clean, state-managed mock "database". The store (src/store)
   hydrates from here on first run and persists to localStorage.
   ============================================================ */

export const USERS = [
  { id: "u1", name: "Lina Haddad", ar: "لينا حداد", role: "manager", initials: "LH", color: "oklch(0.40 0.060 148)" },
  { id: "u2", name: "Omar Khalil", ar: "عمر خليل", role: "member", initials: "OK", color: "oklch(0.58 0.110 32)" },
  { id: "u3", name: "Sara Nasser", ar: "سارة ناصر", role: "member", initials: "SN", color: "oklch(0.62 0.090 200)" },
  { id: "u4", name: "Yusef Amari", ar: "يوسف العماري", role: "member", initials: "YA", color: "oklch(0.62 0.090 70)" },
  { id: "u5", name: "Maya Tannous", ar: "مايا طنوس", role: "member", initials: "MT", color: "oklch(0.52 0.090 300)" },
  { id: "u6", name: "Khaled Daher", ar: "خالد ضاهر", role: "member", initials: "KD", color: "oklch(0.55 0.080 250)" },
];

export const PROJECTS = [
  { id: "p1", name: "National Guard – Makkah", ar: "الحرس الوطني مكة" },
  { id: "p2", name: "Imtithal", ar: "امتثال" },
  { id: "p3", name: "Turaif", ar: "طريف" },
  { id: "p4", name: "Head Office", ar: "المكتب الرئيسي" },
];

export const PROJECT_DOT = {
  p1: "oklch(0.55 0.075 148)",
  p2: "oklch(0.65 0.080 220)",
  p3: "oklch(0.70 0.090 70)",
  p4: "oklch(0.55 0.060 280)",
};

// Status: backlog | progress | review | done  (+ rejected feedback path)
export const TASKS = [];

export const STATUS_META = {
  backlog: { en: "Backlog", ar: "قائمة الانتظار", dot: "oklch(0.78 0.012 100)" },
  progress: { en: "In Progress", ar: "قيد التنفيذ", dot: "oklch(0.62 0.090 200)" },
  review: { en: "In Review", ar: "قيد المراجعة", dot: "oklch(0.70 0.110 70)" },
  done: { en: "Done", ar: "مكتمل", dot: "oklch(0.55 0.075 148)" },
};

export const PRIORITY_META = {
  urgent: { en: "Urgent", ar: "عاجل" },
  high: { en: "High", ar: "مرتفع" },
  med: { en: "Medium", ar: "متوسط" },
  low: { en: "Low", ar: "منخفض" },
};

// ===== Lookups / label helpers =====
let _users = USERS;
export const getUsers = () => _users;
export const setUsers = (u) => { _users = Array.isArray(u) && u.length ? u : USERS; };
export const findUser = (id) => _users.find((u) => u.id === id);
let _projects = PROJECTS;
export const getProjects = () => _projects;
export const setProjects = (p) => { _projects = Array.isArray(p) && p.length ? p : PROJECTS; };
export const findProject = (id) => _projects.find((p) => p.id === id);
const PROJECT_PALETTE = ["oklch(0.55 0.075 148)","oklch(0.65 0.080 220)","oklch(0.70 0.090 70)","oklch(0.55 0.060 280)","oklch(0.58 0.10 20)","oklch(0.55 0.09 320)"];
export const projectDot = (id) => PROJECT_DOT[id] || PROJECT_PALETTE[Math.abs([...String(id)].reduce((h,c)=>h*31+c.charCodeAt(0),0))%PROJECT_PALETTE.length];
export const userName = (u, lang) => (u ? (lang === "ar" ? u.ar : u.name) : "");
export const projectName = (p, lang) => (p ? (lang === "ar" ? p.ar : p.name) : "");
export const statusLabel = (s, lang) => STATUS_META[s][lang];
export const priorityLabel = (p, lang) => PRIORITY_META[p][lang];
export const taskTitle = (t, lang) => (lang === "ar" ? t.ar_title : t.title);
export const taskDesc = (t, lang) => (lang === "ar" ? t.ar_desc : t.desc);

// ===== Date helpers — "today" is fixed to May 28 2026 (demo dataset) =====
export const TODAY = new Date("2026-05-28");
export function daysUntil(iso) {
  const d = new Date(iso);
  return Math.round((d - TODAY) / 86400000);
}
export function dueLabel(iso, lang) {
  const n = daysUntil(iso);
  if (n < 0) return (lang === "ar" ? "متأخرة " : "") + Math.abs(n) + (lang === "ar" ? " يوم" : "d overdue");
  if (n === 0) return lang === "ar" ? "اليوم" : "Today";
  if (n === 1) return lang === "ar" ? "غداً" : "Tomorrow";
  if (n < 7) return lang === "ar" ? `بعد ${n} أيام` : `${n}d`;
  const d = new Date(iso);
  const month = d.toLocaleString(lang === "ar" ? "ar-EG" : "en-US", { month: "short" });
  return `${month} ${d.getDate()}`;
}

// ============================================================
//  Quotations + procurement helpers
// ============================================================
export const TASK_TYPE_META = {
  assignment: { en: "Assignment", ar: "مهمة", icon: "tasks" },
  procurement: { en: "Procurement", ar: "شراء", icon: "quote" },
  recurring: { en: "Recurring", ar: "متكرر", icon: "repeat" },
};
export const quotationVendor = (q, lang) => (lang === "ar" && q.ar_vendor ? q.ar_vendor : q.vendor);
export const quotationNote = (q, lang) => (lang === "ar" && q.ar_note ? q.ar_note : q.note);

// App currency. Western digits, formatted with the "en-US" grouping.
export const CURRENCY = "SAR";
export function fmtMoney(amount, currency = CURRENCY) {
  const n = Number(amount) || 0;
  return `${n.toLocaleString("en-US")} ${currency || CURRENCY}`;
}

// ============================================================
//  Recurring duties — templates + instance generation + streaks
// ============================================================
export const RECURRENCE_META = {
  daily: { en: "Daily", ar: "يومي" },
  weekly: { en: "Weekly", ar: "أسبوعي" },
  monthly: { en: "Monthly", ar: "شهري" },
};

// history = list of completed period keys (see periodKey()).
export const RECURRING_TEMPLATES = [];

const isoDate = (d) => d.toISOString().slice(0, 10);
function mondayOf(d) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // 0 = Monday
  x.setDate(x.getDate() - day);
  return x;
}

// A stable key identifying the current occurrence of a recurrence.
export function periodKey(freq, date = TODAY) {
  if (freq === "weekly") return isoDate(mondayOf(date));
  if (freq === "monthly") return isoDate(date).slice(0, 7); // YYYY-MM
  return isoDate(date); // daily
}

// Offset of a weekday from Monday.
const DOW_OFFSET = { mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5, sun: 6 };

// The due date for the current occurrence.
export function periodDue(rec, date = TODAY) {
  if (rec.freq === "weekly") {
    const m = mondayOf(date);
    const d = new Date(m);
    d.setDate(m.getDate() + (DOW_OFFSET[rec.day] ?? 4));
    return isoDate(d);
  }
  if (rec.freq === "monthly") {
    const dom = rec.dom || 1;
    let dt = new Date(date.getFullYear(), date.getMonth(), dom);
    if (dt < date) dt = new Date(date.getFullYear(), date.getMonth() + 1, dom);
    return isoDate(dt);
  }
  return isoDate(date); // daily
}

export const recurrenceLabel = (rec, lang) => RECURRENCE_META[rec.freq][lang];

function prevPeriodKey(key, freq) {
  if (freq === "weekly") {
    const d = new Date(key);
    d.setDate(d.getDate() - 7);
    return isoDate(d);
  }
  if (freq === "monthly") {
    // Pure year/month arithmetic — avoids the Date constructor's local↔UTC
    // shift that can land the key in the wrong month near month boundaries.
    let [y, m] = key.split("-").map(Number);
    m -= 1;
    if (m < 1) { m = 12; y -= 1; }
    return `${y}-${String(m).padStart(2, "0")}`;
  }
  const d = new Date(key);
  d.setDate(d.getDate() - 1);
  return isoDate(d);
}

// Consecutive completed periods, counting back from the most recent.
export function computeStreak(history, freq) {
  if (!history || !history.length) return 0;
  const set = new Set(history);
  const sorted = [...history].sort();
  let cur = sorted[sorted.length - 1];
  let streak = 0;
  while (set.has(cur)) {
    streak++;
    cur = prevPeriodKey(cur, freq);
  }
  return streak;
}

// Build the task instance for a template's current period.
export function genRecurringInstance(template, date = TODAY) {
  const pk = periodKey(template.recurrence.freq, date);
  return {
    id: `${template.id}·${pk}`,
    type: "recurring",
    templateId: template.id,
    periodKey: pk,
    title: template.title,
    ar_title: template.ar_title,
    desc: template.desc,
    ar_desc: template.ar_desc,
    project: template.project,
    priority: template.priority,
    assignee: template.assignee,
    status: "backlog",
    due: periodDue(template.recurrence, date),
    created: isoDate(date),
    progress: 0,
    attachments: [],
    subtasks: [],
    quotations: [],
    activity: [{ kind: "system", who: "u1", at: "Today", text: "recurring task generated", ar: "تم توليد المهمة المتكررة" }],
  };
}
