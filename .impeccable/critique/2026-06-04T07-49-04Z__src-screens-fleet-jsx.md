---
target: fleet dashboard + vehicle profile
total_score: 25
p0_count: 0
p1_count: 3
timestamp: 2026-06-04T07-49-04Z
slug: src-screens-fleet-jsx
---
# Critique: Fleet dashboard + vehicle profile (src/screens/Fleet.jsx)

## Design Health Score
| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Good: status pills, service/doc chips, toasts. No load states (local-first). |
| 2 | Match System / Real World | 3 | Strong domain + Arabic; "efficiency (May)" month is hardcoded. |
| 3 | User Control and Freedom | 2 | Back + form cancel + delete confirm, but doc/maint removal is instant with no undo. |
| 4 | Consistency and Standards | 3 | Reuses panel/queue/list-row/chips well; a few bespoke grids diverge. |
| 5 | Error Prevention | 2 | "Add vehicle" creates a blank record and opens it; doc remove has no confirm. |
| 6 | Recognition Rather Than Recall | 3 | Actions labeled, icons + text, alerts surfaced. |
| 7 | Flexibility and Efficiency | 2 | No keyboard shortcuts, no bulk actions, no sort/filter on the vehicles list. |
| 8 | Aesthetic and Minimalist | 3 | Calm and on-brand, but 4 equal panels + 6-button header add noise. |
| 9 | Error Recovery | 2 | Instant deletes without undo; bare empty states ("—"). |
| 10 | Help and Documentation | 2 | No contextual help or actionable empty states. |
| **Total** | | **25/40** | **Acceptable: solid bones, real gaps.** |

## Anti-Patterns Verdict
Not AI slop. It avoids the card-grid/hero-metric cliches: real operational data (per-vehicle km/L + cost, per-project cost bars, severity-coded alert queues). Detector scan (detect.mjs) on the source returned no findings (it targets markup/CSS; this is inline-styled JSX, so low signal). No side-stripe borders, gradient text, or glassmorphism observed.

## What's Working
1. Dashboard information scent: 4 KPIs plus two clickable, severity-colored queues (expiry, service-due) put the day's real work one tap away. On-brand calm density.
2. Status is never color-only: dot + label pills satisfy the color-blind-safe goal.
3. Genuinely useful analytics (efficiency bar + km/L + cost per vehicle, per-project cost) instead of decorative widgets.

## Priority Issues
- [P1] Action overload + misplaced destructive action in the vehicle header. Up to 6 buttons in one row (Edit, Log fuel, Add maintenance, Reassign, Report issue, Delete), exceeding the ~4 working-memory limit, with red Delete inline beside routine actions. Fix: one primary (Report issue) + Log fuel, collapse the rest into a "More" overflow menu, isolate Delete there. Command: /impeccable layout.
- [P1] Flat hierarchy in the vehicle profile. Overview / Documents / Maintenance / Fuel are four equal full-width panels with identical headers; the urgent answer (is this vehicle legal + serviced now?) is not surfaced first. Fix: a top status summary that elevates an expired doc or overdue service. Command: /impeccable layout.
- [P1] Low-contrast meta text. Muted lines use ink-400/ink-500 at 10.5 to 12px (plate numbers, meta, chips), landing near or below 3.5:1, under the AA 4.5:1 the project committed to. Fix: bump small muted text toward ink-700, or enlarge. Command: /impeccable audit.
- [P2] "Add vehicle" creates a blank record then opens it. Abandoned adds leave junk vehicles with empty plates. Fix: a proper add modal (as the asset register now has). Command: /impeccable harden.
- [P2] Bare empty states + instant deletes. "—" / "no records" give no next step; doc removal deletes with no confirm/undo. Command: /impeccable onboard (empty states) + /impeccable harden (confirm/undo).

## Persona Red Flags
- Mansour (Logistics Manager, project persona): the dashboard serves him, but the vehicles list has no sort/filter (the task hub has them), so "show all overdue" means scanning. Delete sitting beside routine edits risks a costly misclick.
- Sam (Accessibility): small muted text below AA contrast is the main barrier; icon-only doc-remove does have an aria-label (good); status dot+label is good.
- Alex (Power user): no keyboard shortcuts, no bulk actions, one-vehicle-at-a-time.

## Minor Observations
- Efficiency panel says "(May / مايو)" literally; CUR_MONTH is derived from TODAY, so the label and the data will drift apart next month.
- Arabic plate text renders in mono (Geist Mono); Arabic glyphs in a mono Latin face look off. Consider not forcing mono for Arabic plates.
- The vehicles list 6-column grid can crowd on smaller laptop widths.

## Questions to Consider
- What is the one thing a manager needs to know the instant a vehicle opens, and is it the first thing they see?
- Should the vehicles list share the task hub's sort/filter so "all overdue" is one action?
