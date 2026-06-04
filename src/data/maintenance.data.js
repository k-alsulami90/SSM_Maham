// Real oil-change history from the workshop bills (car_maintenance_bills.csv).
// Matched to each vehicle by plate number + delegate (driver).
//  - cost is the TOTAL incl. 15% VAT (the bill's `cost` column).
//  - odo is the bill's raw odometer; some have a data-entry extra digit
//    (e.g. 260060 should be 26006). fleet.js fixes these against the car's
//    real odometer, then derives each car's service interval from the gaps.
//  - plateNo completes the vehicle's plate (letters + number).
export const VEHICLE_MAINT = {
  "V-01": { plateNo: "1925", everyKm: 5000, everyMonths: 3, entries: [
    { date: "2026-05-29", odo: 393730, cost: 121.118 },
    { date: "2025-12-04", odo: 388391, cost: 110.538 },
  ] },
  "V-02": { plateNo: "2767", everyKm: 10000, everyMonths: 6, entries: [
    { date: "2026-04-07", odo: 600660, cost: 229.885 },
    { date: "2026-01-31", odo: 50477, cost: 229.885 },
    { date: "2025-12-04", odo: 40491, cost: 229.885 },
    { date: "2025-09-28", odo: 28771, cost: 229.885 },
  ] },
  "V-03": { plateNo: "2769", everyKm: 10000, everyMonths: 6, entries: [
    { date: "2026-03-13", odo: 66631, cost: 196.869 },
    { date: "2025-11-09", odo: 56419, cost: 229.885 },
    { date: "2025-09-26", odo: 47470, cost: 226.182 },
  ] },
  "V-05": { plateNo: "1195", everyKm: 5000, everyMonths: 3, entries: [
    { date: "2026-05-31", odo: 400053, cost: 123.567 },
  ] },
  "V-06": { plateNo: "1196", everyKm: 5000, everyMonths: 3, entries: [
    { date: "2026-05-28", odo: 58087, cost: 123.567 },
    { date: "2026-05-03", odo: 50764, cost: 331.66 },
    { date: "2026-03-22", odo: 453940, cost: 183.264 },
    { date: "2026-03-22", odo: 453940, cost: 37.95 },
    { date: "2026-02-17", odo: 382760, cost: 112.056 },
    { date: "2026-01-01", odo: 32137, cost: 112.056 },
    { date: "2025-12-01", odo: 260060, cost: 112.056 },
    { date: "2025-11-13", odo: 20498, cost: 112.056 },
    { date: "2025-10-27", odo: 153930, cost: 112.056 },
    { date: "2025-09-17", odo: 10263, cost: 112.056 },
  ] },
  "V-07": { plateNo: "1197", everyKm: 5000, everyMonths: 3, entries: [
    { date: "2026-05-24", odo: 32744, cost: 188.416 },
    { date: "2026-04-02", odo: 27436, cost: 233.588 },
    { date: "2026-03-08", odo: 22342, cost: 233.588 },
    { date: "2025-11-23", odo: 128530, cost: 105.052 },
  ] },
  "V-11": { plateNo: "4123", everyKm: 5000, everyMonths: 3, entries: [
    { date: "2026-05-16", odo: 5094, cost: 196.42 },
  ] },
};
