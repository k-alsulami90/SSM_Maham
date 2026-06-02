# Fleet import — `fleet.csv`

Fill one row per vehicle. **Delete the two `EXAMPLE-*` rows** before sending it back.
Leave any cell blank if you don't have it yet — I'll handle the gaps on import.

## Columns
| Column | What to put | Notes |
|---|---|---|
| `code` | leave blank | I'll auto-assign (V-01, V-02 …) |
| `plate` | plate number | any text |
| `make` | e.g. Toyota | |
| `model` | e.g. Hilux | |
| `year` | e.g. 2022 | |
| `type` | one of: `pickup` `suv` `van` `truck` `sedan` `equipment` | |
| `status` | one of: `active` `in_shop` `idle` `retired` | |
| `project` | your project name | must match a project in the app |
| `custodian` | person's name (optional) | links to a user; leave blank if unsure |
| `fuel_type` | `diesel` or `petrol` | |
| `odometer` | current km | number |
| `service_every_km` | service interval in km, e.g. 5000 | |
| `service_every_months` | service interval in months, e.g. 3 | |
| `last_service_date` | YYYY-MM-DD | last time it was serviced |
| `last_service_km` | km at last service | |
| `purchase_date` | YYYY-MM-DD | optional |
| `purchase_value` | number (USD) | optional |
| `registration_expires` | YYYY-MM-DD | drives expiry alerts |
| `insurance_expires` | YYYY-MM-DD | drives expiry alerts |
| `inspection_expires` | YYYY-MM-DD | optional |

## Dates
Use the format **YYYY-MM-DD** (e.g. `2026-06-20`). Blank is fine.

When you've filled it in, tell me and I'll turn it into the database import.
