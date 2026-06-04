// Real oil-change history from the workshop bills (car_maintenance_bills.csv).
// Matched to each vehicle by plate number + delegate (driver). Notes:
//  - cost is the TOTAL incl. 15% VAT (the bill's `cost` column).
//  - the bills' odometer column had data-entry errors, so it is omitted; the
//    oil grade in each bill sets the interval (everyKm): MG = 10,000 km,
//    Isuzu/Nissan = 5,000 km.
// Schedule is anchored on the car's live odometer (from the fuel report) so
// "next service" counts down from the real reading.
export const VEHICLE_MAINT = {
  "V-01": { everyKm: 5000, everyMonths: 3, entries: [
    { date: "2026-05-29", cost: 121.118 },
    { date: "2025-12-04", cost: 110.538 },
  ] },
  "V-02": { everyKm: 10000, everyMonths: 6, entries: [
    { date: "2026-04-07", cost: 229.885 },
    { date: "2026-01-31", cost: 229.885 },
    { date: "2025-12-04", cost: 229.885 },
    { date: "2025-09-28", cost: 229.885 },
  ] },
  "V-03": { everyKm: 10000, everyMonths: 6, entries: [
    { date: "2026-03-13", cost: 196.869 },
    { date: "2025-11-09", cost: 229.885 },
    { date: "2025-09-26", cost: 226.182 },
  ] },
  "V-05": { everyKm: 5000, everyMonths: 3, entries: [
    { date: "2026-05-31", cost: 123.567 },
  ] },
  "V-06": { everyKm: 5000, everyMonths: 3, entries: [
    { date: "2026-05-28", cost: 123.567 },
    { date: "2026-05-03", cost: 331.66 },
    { date: "2026-03-22", cost: 183.264 },
    { date: "2026-03-22", cost: 37.95 },
    { date: "2026-02-17", cost: 112.056 },
    { date: "2026-01-01", cost: 112.056 },
    { date: "2025-12-01", cost: 112.056 },
    { date: "2025-11-13", cost: 112.056 },
    { date: "2025-10-27", cost: 112.056 },
    { date: "2025-09-17", cost: 112.056 },
  ] },
  "V-07": { everyKm: 5000, everyMonths: 3, entries: [
    { date: "2026-05-24", cost: 188.416 },
    { date: "2026-04-02", cost: 233.588 },
    { date: "2026-03-08", cost: 233.588 },
    { date: "2025-11-23", cost: 105.052 },
  ] },
  "V-11": { everyKm: 5000, everyMonths: 3, entries: [
    { date: "2026-05-16", cost: 196.42 },
  ] },
};
