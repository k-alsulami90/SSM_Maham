import { describe, it, expect } from "vitest";
import { computeStreak, dueLabel, daysUntil } from "./mock.js";
import { nextService, fuelEfficiency, docExpiryState, buildFleetTasks } from "./fleet.js";
import { nextServiceTime, buildAssetTasks } from "./assets.js";

// "today" in the dataset is 2026-05-28.

describe("computeStreak", () => {
  it("counts consecutive daily periods from the latest", () => {
    expect(computeStreak(["2026-05-25", "2026-05-26", "2026-05-27"], "daily")).toBe(3);
  });
  it("stops at a gap", () => {
    expect(computeStreak(["2026-05-20", "2026-05-26", "2026-05-27"], "daily")).toBe(2);
  });
  it("handles monthly keys", () => {
    expect(computeStreak(["2026-03", "2026-04"], "monthly")).toBe(2);
  });
  it("returns 0 for empty history", () => {
    expect(computeStreak([], "daily")).toBe(0);
  });
});

describe("dueLabel / daysUntil", () => {
  it("flags overdue", () => {
    expect(daysUntil("2026-05-20")).toBeLessThan(0);
    expect(dueLabel("2026-05-20", "en")).toContain("overdue");
  });
  it("says Today for the anchor date", () => {
    expect(dueLabel("2026-05-28", "en")).toBe("Today");
  });
});

describe("docExpiryState", () => {
  it("expired when past", () => {
    expect(docExpiryState("2026-05-01").state).toBe("expired");
  });
  it("soon within 30 days", () => {
    expect(docExpiryState("2026-06-10").state).toBe("soon");
  });
  it("warn within 60 days", () => {
    expect(docExpiryState("2026-07-20").state).toBe("warn");
  });
  it("ok beyond 60 days", () => {
    expect(docExpiryState("2026-12-01").state).toBe("ok");
  });
});

describe("fuelEfficiency", () => {
  it("computes km per litre tank-to-tank", () => {
    const v = { fuel: [{ odometer: 1000, liters: 60 }, { odometer: 1300, liters: 30 }, { odometer: 1500, liters: 20 }] };
    // distance 500 over liters added after the first fill (30+20=50) = 10 km/L
    expect(fuelEfficiency(v)).toBeCloseTo(10, 5);
  });
  it("returns null with insufficient data", () => {
    expect(fuelEfficiency({ fuel: [{ odometer: 1000, liters: 60 }] })).toBe(null);
  });
});

describe("nextService (time + odometer, whichever first)", () => {
  const sched = (over) => ({
    id: "V", odometer: over ? 9000 : 2000,
    schedule: { everyKm: 5000, everyMonths: 3, lastServiceKm: 1000, lastServiceDate: over ? "2026-01-01" : "2026-05-15" },
  });
  it("ok when both thresholds are ahead", () => {
    expect(nextService(sched(false)).state).toBe("ok");
  });
  it("overdue when km or date passed", () => {
    expect(nextService(sched(true)).state).toBe("overdue");
  });
});

describe("nextServiceTime (assets, time only)", () => {
  it("null without a schedule", () => {
    expect(nextServiceTime({ schedule: null })).toBe(null);
  });
  it("overdue when the date has passed", () => {
    expect(nextServiceTime({ schedule: { everyMonths: 3, lastServiceDate: "2026-01-01" } }).state).toBe("overdue");
  });
});

describe("auto-task generation", () => {
  it("builds a service task for an overdue vehicle and de-dupes by id", () => {
    const vehicles = [{ id: "V-1", plate: "P", make: "T", model: "X", odometer: 9000, project: "p2", custodian: "u2", documents: [], schedule: { everyKm: 5000, everyMonths: 3, lastServiceKm: 1000, lastServiceDate: "2026-01-01" } }];
    const tasks = buildFleetTasks(vehicles);
    expect(tasks.some((t) => t.id === "SVC-V-1-2026-01-01")).toBe(true);
    // Same input ⇒ same ids (idempotent generation).
    expect(buildFleetTasks(vehicles).map((t) => t.id)).toEqual(tasks.map((t) => t.id));
  });
  it("builds a renewal task for an asset warranty expiring soon", () => {
    const assets = [{ id: "A-1", tag: "T", name: "N", project: "p4", custodian: "u3", documents: [{ id: "d1", kind: "warranty", expires: "2026-06-10" }], schedule: null }];
    const tasks = buildAssetTasks(assets);
    expect(tasks.some((t) => t.id === "ARENEW-A-1-d1")).toBe(true);
  });
});
