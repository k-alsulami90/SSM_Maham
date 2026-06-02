/* Aggregates the full May fuel report (data/fuel-may.csv) into the fleet seed:
   one vehicle per internal number, with every fill attached (real liters/cost
   in SAR + odometer). Run: node scripts/parse-fuel.mjs */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const raw = readFileSync(join(root, "data", "fuel-may.csv"), "utf8");

// Identity per internal fleet number (plate digits were masked in the export).
const META = {
  1: { plate: "أ ه ن", driver: "محمد محمود", type: "pickup", project: "p1" },
  2: { plate: "ر ل م", driver: "النزيلي", type: "sedan", project: "p4" },
  3: { plate: "ر ل م", driver: "MG خدمات", type: "sedan", project: "p2" },
  4: { plate: "ر ح د", driver: "عبدالملك إسماعيل", type: "sedan", project: "p4" },
  5: { plate: "ب ق ح", driver: "محمد وايل", type: "pickup", project: "p1" },
  6: { plate: "ب ق ح", driver: "هيثم غندور", type: "pickup", project: "p1" },
  7: { plate: "ب ق ح", driver: "نويت 97 طريف", type: "pickup", project: "p3" },
  8: { plate: "ب ق ب", driver: "باص الإدارة", type: "van", project: "p1" },
  9: { plate: "ب ق ب", driver: "باص طريف", type: "van", project: "p3" },
  10: { plate: "ب ق ب", driver: "دينة طريف", type: "truck", project: "p3" },
  11: { plate: "ب ق ل", driver: "ونيت دبل طريف", type: "pickup", project: "p3" },
};

const lines = raw.split(/\r?\n/).slice(1).filter(Boolean); // drop header
const groups = {};
for (const line of lines) {
  const c = line.split(";");
  if (!/^\d{6,}$/.test((c[0] || "").trim())) continue;
  const n = Number((c[5] || "").trim());
  if (!META[n]) continue;
  (groups[n] ||= { make: c[3].trim(), model: c[4].trim(), fuel: c[7].trim() === "diesel" ? "diesel" : "petrol", fills: [] }).fills.push({
    date: (c[22] || "").trim().slice(0, 10),
    odometer: parseInt(c[15], 10),
    liters: parseFloat(c[14]),
    cost: parseFloat(c[11]),
  });
}

const VEH = Object.keys(groups)
  .map(Number)
  .sort((a, b) => a - b)
  .map((n) => {
    const g = groups[n];
    const m = META[n];
    const fills = g.fills
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map((f, i) => ({ id: "f" + (i + 1), date: f.date, odometer: f.odometer, liters: f.liters, cost: f.cost, currency: "SAR", station: "" }));
    return {
      id: "V-" + String(n).padStart(2, "0"),
      internalNo: n,
      plate: m.plate,
      make: g.make,
      model: g.model,
      type: m.type,
      fuelType: m.fuel,
      project: m.project,
      driverNote: m.driver,
      odometer: Math.max(...fills.map((f) => f.odometer)),
      fuel: fills,
    };
  });

const out =
  "// AUTO-GENERATED from data/fuel-may.csv by scripts/parse-fuel.mjs — do not edit by hand.\n" +
  "// Full May fuel logs per vehicle (real liters/cost in SAR).\n" +
  "export const FLEET_SEED = " + JSON.stringify(VEH, null, 2) + ";\n";
writeFileSync(join(root, "src", "data", "vehicles.data.js"), out);

// Sanity report
const byProj = {};
let totCost = 0, totLiters = 0;
VEH.forEach((v) => {
  const c = v.fuel.reduce((s, f) => s + f.cost, 0);
  const l = v.fuel.reduce((s, f) => s + f.liters, 0);
  byProj[v.project] = (byProj[v.project] || 0) + c;
  totCost += c; totLiters += l;
  console.log(`${v.id} #${v.internalNo} ${v.make} ${v.model}  fills:${v.fuel.length}  cost:${c.toFixed(2)}  liters:${l.toFixed(1)}`);
});
console.log("by project:", Object.fromEntries(Object.entries(byProj).map(([k, v]) => [k, v.toFixed(2)])));
console.log("TOTAL cost:", totCost.toFixed(2), " liters:", totLiters.toFixed(3), " vehicles:", VEH.length);
