import { describe, it, expect } from "vitest";
import { reducer } from "./AppStore.jsx";

// Minimal, deterministic state so reducer behaviour is tested in isolation.
function baseState() {
  return {
    settings: { lang: "en", accent: "forest", theme: "light", role: "manager", currentUserId: "u1" },
    templates: [
      { id: "R-1", recurrence: { freq: "daily" }, history: ["2026-05-27"], assignee: "u2", project: "p2", priority: "med", title: "x", ar_title: "x", desc: "", ar_desc: "" },
    ],
    vehicles: [
      { id: "V-1", plate: "P-1", odometer: 1000, status: "active", project: "p2", custodian: "u2", currency: "USD", schedule: { everyKm: 5000, everyMonths: 3, lastServiceKm: 1000, lastServiceDate: "2026-05-01" }, documents: [], maintenance: [], fuel: [] },
    ],
    assets: [
      { id: "A-1", name: "Laptop", category: "it", status: "in_use", project: "p4", custodian: "u3", documents: [{ id: "d1", kind: "warranty", expires: "2027-01-01" }], maintenance: [], schedule: null, purchaseValue: 1000, currency: "USD" },
    ],
    tasks: [
      { id: "T-1", type: "assignment", status: "progress", assignee: "u2", project: "p1", progress: 50, subtasks: [{ id: "s1", done: false }, { id: "s2", done: true }], activity: [], quotations: [], attachments: [] },
      { id: "T-2", type: "procurement", status: "review", assignee: "u2", project: "p1", quotations: [{ id: "q1", vendor: "Acme", amount: 100, recommended: false }, { id: "q2", vendor: "Globex", amount: 90, recommended: false }], selectedQuotationId: null, activity: [], subtasks: [] },
      { id: "REC-1", type: "recurring", status: "backlog", templateId: "R-1", periodKey: "2026-05-28", assignee: "u2", activity: [], subtasks: [] },
    ],
  };
}
const task = (s, id) => s.tasks.find((t) => t.id === id);

describe("settings", () => {
  it("switching role to member swaps the signed-in user", () => {
    const s = reducer(baseState(), { type: "SET_SETTING", key: "role", value: "member" });
    expect(s.settings.role).toBe("member");
    expect(s.settings.currentUserId).toBe("u2");
  });
});

describe("status transitions", () => {
  it("approve sets done, 100% progress, and logs 'approved'", () => {
    const s = reducer(baseState(), { type: "SET_STATUS", id: "T-2", status: "done", actorId: "u1" });
    const t = task(s, "T-2");
    expect(t.status).toBe("done");
    expect(t.progress).toBe(100);
    expect(t.activity.at(-1).text).toBe("approved");
  });

  it("reject (logKey) moves to progress but logs 'requested changes'", () => {
    const s = reducer(baseState(), { type: "SET_STATUS", id: "T-2", status: "progress", logKey: "rejected", actorId: "u1" });
    const t = task(s, "T-2");
    expect(t.status).toBe("progress");
    expect(t.activity.at(-1).text).toBe("requested changes");
  });

  it("does not mutate the previous state (immutability)", () => {
    const before = baseState();
    const snapshot = JSON.stringify(before);
    reducer(before, { type: "SET_STATUS", id: "T-1", status: "done", actorId: "u1" });
    expect(JSON.stringify(before)).toBe(snapshot);
  });
});

describe("subtasks", () => {
  it("toggling recomputes progress", () => {
    const s = reducer(baseState(), { type: "TOGGLE_SUBTASK", id: "T-1", subtaskId: "s1" });
    expect(task(s, "T-1").progress).toBe(100); // both done now
  });
  it("adds a subtask", () => {
    const s = reducer(baseState(), { type: "ADD_SUBTASK", id: "T-1", text: "new" });
    expect(task(s, "T-1").subtasks).toHaveLength(3);
  });
});

describe("comments", () => {
  it("appends a message entry", () => {
    const s = reducer(baseState(), { type: "ADD_COMMENT", id: "T-1", text: "hi", actorId: "u2" });
    const a = task(s, "T-1").activity.at(-1);
    expect(a.kind).toBe("msg");
    expect(a.text).toBe("hi");
  });
});

describe("quotations", () => {
  it("flags exactly one recommended quote", () => {
    let s = reducer(baseState(), { type: "SET_RECOMMENDED", id: "T-2", quoteId: "q1" });
    s = reducer(s, { type: "SET_RECOMMENDED", id: "T-2", quoteId: "q2" });
    const qs = task(s, "T-2").quotations;
    expect(qs.find((q) => q.id === "q2").recommended).toBe(true);
    expect(qs.find((q) => q.id === "q1").recommended).toBe(false);
  });

  it("selecting a quotation sets the pick, moves to progress, and logs the vendor", () => {
    const s = reducer(baseState(), { type: "SELECT_QUOTATION", id: "T-2", quoteId: "q2", reason: "best price", actorId: "u1" });
    const t = task(s, "T-2");
    expect(t.selectedQuotationId).toBe("q2");
    expect(t.status).toBe("progress");
    expect(t.activity.at(-1).text).toContain("Globex");
  });

  it("adds and removes a quotation (clearing the pick if removed)", () => {
    let s = reducer(baseState(), { type: "ADD_QUOTATION", id: "T-2", quote: { id: "q3", vendor: "Initech", amount: 80 } });
    expect(task(s, "T-2").quotations).toHaveLength(3);
    s = reducer(s, { type: "SELECT_QUOTATION", id: "T-2", quoteId: "q3", actorId: "u1" });
    s = reducer(s, { type: "REMOVE_QUOTATION", id: "T-2", quoteId: "q3" });
    expect(task(s, "T-2").selectedQuotationId).toBe(null);
  });
});

describe("create + undo", () => {
  it("creates a task", () => {
    const s = reducer(baseState(), { type: "CREATE_TASK", task: { id: "T-9", title: "New" } });
    expect(s.tasks).toHaveLength(4);
    expect(task(s, "T-9").title).toBe("New");
  });
  it("RESTORE_TASK reverts a task to a prior snapshot", () => {
    const start = baseState();
    const prev = task(start, "T-2");
    const changed = reducer(start, { type: "SET_STATUS", id: "T-2", status: "done", actorId: "u1" });
    const restored = reducer(changed, { type: "RESTORE_TASK", task: prev });
    expect(task(restored, "T-2").status).toBe("review");
  });
});

describe("recurring streak", () => {
  it("completing a recurring instance records its period on the template", () => {
    const s = reducer(baseState(), { type: "SET_STATUS", id: "REC-1", status: "done", actorId: "u2" });
    expect(s.templates.find((t) => t.id === "R-1").history).toContain("2026-05-28");
  });
});

describe("fleet actions", () => {
  it("logging fuel appends and advances the odometer", () => {
    const s = reducer(baseState(), { type: "ADD_FUEL", vehicleId: "V-1", entry: { id: "f1", odometer: 1200, liters: 40, cost: 50 } });
    const v = s.vehicles[0];
    expect(v.fuel).toHaveLength(1);
    expect(v.odometer).toBe(1200);
  });
  it("maintenance with resetsSchedule updates the service clock", () => {
    const s = reducer(baseState(), { type: "ADD_MAINTENANCE", vehicleId: "V-1", resetsSchedule: true, entry: { id: "m1", date: "2026-05-28", odometer: 1300, category: "service", cost: 40 } });
    const v = s.vehicles[0];
    expect(v.schedule.lastServiceKm).toBe(1300);
    expect(v.schedule.lastServiceDate).toBe("2026-05-28");
  });
  it("reporting a vehicle issue creates a linked task", () => {
    const s = reducer(baseState(), { type: "REPORT_ISSUE", vehicleId: "V-1", text: "flat tyre", actorId: "u2" });
    const issue = s.tasks.at(-1);
    expect(issue.vehicleId).toBe("V-1");
    expect(issue.fleet).toBe(true);
  });
});

describe("asset actions", () => {
  it("adds and removes an asset document", () => {
    let s = reducer(baseState(), { type: "ADD_ASSET_DOC", assetId: "A-1", doc: { id: "d2", kind: "invoice", expires: "" } });
    expect(s.assets[0].documents).toHaveLength(2);
    s = reducer(s, { type: "REMOVE_ASSET_DOC", assetId: "A-1", docId: "d2" });
    expect(s.assets[0].documents).toHaveLength(1);
  });
  it("updates an asset (reassign project + custodian)", () => {
    const s = reducer(baseState(), { type: "UPDATE_ASSET", id: "A-1", patch: { project: "p2", custodian: "u4" } });
    expect(s.assets[0].project).toBe("p2");
    expect(s.assets[0].custodian).toBe("u4");
  });
  it("reporting an asset issue creates a linked task", () => {
    const s = reducer(baseState(), { type: "REPORT_ASSET_ISSUE", assetId: "A-1", text: "screen cracked", actorId: "u3" });
    const issue = s.tasks.at(-1);
    expect(issue.assetId).toBe("A-1");
    expect(issue.asset).toBe(true);
  });
});
