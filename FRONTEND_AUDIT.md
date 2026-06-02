# Mahām · Frontend audit & enhancement plan

Goal: make the UI **clearer and bigger**, integrate a **custom Arabic font** (Arabic words
only — English + numbers stay on the Latin font), and enforce **Western digits (0–9)**
everywhere. Reviewed against: readability · hierarchy · density/spacing · consistency ·
RTL/Arabic parity · accessibility.

---

## A. Global findings (apply across all screens)

### A1. Type scale & base size  ← biggest win
- Today the base is ~13.5px with a lot of **11–12px** secondary text and **11px uppercase**
  section titles — too small/dense.
- **Fix:** introduce a CSS-variable **type scale** (`--fs-xs … --fs-2xl`) and raise the base
  (~15px). Replace hard-coded `font-size` values with the scale so sizing is global.
- **Size toggle:** add a **Text size** setting (S / M / L) in the settings menu + mobile "Me",
  implemented by scaling the root scale (e.g. `--ui-scale: 1 / 1.12 / 1.25`). Persists like theme/accent.

### A2. Spacing & touch targets
- Bump row heights, control padding, and icon-button hit areas to **≥ 40px** (currently 32px).
- More breathing room in dense panels (dashboards, drawers).

### A3. Custom Arabic font (Arabic only)
- Add via `@font-face`; set the Arabic stack so **Latin + digits use the Latin font, Arabic
  glyphs use the new font**: `--font-ar: "Geist", "<ArabicFont>", system-ui`.
- Tune Arabic **line-height** (≈1.7) and letter-spacing; verify across every screen in RTL.

### A4. Numerals = Western 0–9 (both languages)  ← policy
- No Eastern-Arabic digits (٠١٢٣) anywhere, even in Arabic UI.
- Actions: (1) replace any Eastern-Arabic digits in static Arabic strings (e.g. bottleneck
  message "٤٨", some seed titles) with `0–9`; (2) ensure date/number formatting uses Latin
  numbering (`numberingSystem: 'latn'`, or keep numeric output as JS numbers); (3) add
  `font-variant-numeric: lining-nums tabular-nums` for aligned figures.

### A5. Contrast & accessibility
- `--ink-400` secondary text on tinted backgrounds is borderline for WCAG AA — darken a step.
- `.section-title` at 11px uppercase is hard to read — enlarge / reduce letter-spacing.
- Keep the focus rings; ensure every icon-only button has an `aria-label` (most do).

### A6. Tables / lists density
- The `list-row` tables (hub list, vehicles, assets, users, project view) are the main
  "small/cramped" offenders → taller rows, larger text, more column rhythm; consider a card
  layout on narrow widths.

---

## B. Screen-by-screen findings

| Screen | Findings → fixes |
|---|---|
| **Sign-in** | Labels 12px small. → Bump labels/inputs; larger brand; more padding. |
| **Sidebar** | Nav 13.5px, section labels 11px uppercase, project dots tiny, user card 13px. → Scale up nav/labels; clearer active pill; bigger dots. |
| **Topbar** | Crumbs/search 13px; icon buttons 32px. → 36–40px buttons; larger search; ensure crumb hierarchy reads. |
| **Manager dashboard** | Metric label 12px, delta/spark tiny, callout 13px, workload names 13px, legend 11.5px, queue meta 11.5px, donut text small. → Apply scale; enlarge metric labels, legend, queue meta; bigger donut numerals. |
| **Member dashboard** | "Today's focus" cards + review list dense. → Scale cards/rows; larger metric hints. |
| **Task hub · Kanban** | Card title 13.5px, desc 12px (2-line clamp), tags 11px, foot 11.5px. → Larger title/desc/tags; taller cards; clearer column headers. |
| **Task hub · List** | Rows 13px, header 11px uppercase, due 12.5px. → Taller rows, 14–15px, stronger header. |
| **Task drawer** | 380px wide; section-title 11px (too small); field-grid 12.5px; activity 12.5px; composer 13px. → Wider drawer option; enlarge section titles + body; bigger compose box. |
| **Create modal** | Title input 18px ok; chips 12px. → Slightly larger chips; comfortable spacing. |
| **Approvals** | Same `queue-item` density as dashboard. → Apply scale; bigger approve/reject buttons. |
| **Recurring duties** | List rows + streak chips small. → Scale rows; clearer streak/period badges. |
| **Fleet dashboard** | Metric tiles, expiry/maintenance queues, cost & efficiency bars all small-text. → Scale; bigger numbers; label the cost panel currency (currently hard-codes "USD" while fuel is SAR — fix to per-row currency). |
| **Vehicles list** | Dense `list-row` grid. → Taller rows; show driver; larger plate/odometer. |
| **Vehicle profile** | Header sub 13px; overview tiles ok; doc/maint/fuel rows small; forms `qf` 13px. → Scale rows/forms; group the Edit/Log/Reassign actions clearly. |
| **Assets (dash/register/profile)** | Mirrors fleet patterns. → Same scale fixes. |
| **Project view** | Metric tiles + 3 lists. → Scale; clearer section separation. |
| **Users (admin)** | List rows + role `<select>` small; create form ok. → Larger rows + selects; clearer active/inactive. |
| **Mobile** | Tap targets mostly OK; tab bar fine. → Verify size-toggle applies; ensure ≥44px taps; larger stat numbers. |

---

## C. Sequencing
1. **Pass 1 (global, biggest win):** type-scale tokens + raised base, spacing/touch-target bump,
   **size toggle (S/M/L)**, **custom Arabic font**, **Western-numerals cleanup**, contrast tweak.
2. **Pass 2:** screen-by-screen refinements from section B.
3. **Pass 3:** accessibility/contrast verification + mobile clarity.
Build + visual check after each pass.

## D. To start Pass 1
Drop the Arabic font into **`public/fonts/`** (`.woff2` preferred) and tell me the **family
name** + **weights** (e.g. 400/500/700). I'll wire it as Arabic-only with Western digits.
