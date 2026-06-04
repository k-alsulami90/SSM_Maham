---
name: إدارة الخدمات المساندة (Support Services)
description: Earthy-green operations system for tasks, assets, fleet, maintenance and suppliers. Arabic-first, full RTL, Western numerals.
colors:
  forest: "oklch(0.40 0.060 148)"
  forest-hi: "oklch(0.48 0.075 148)"
  moss: "oklch(0.62 0.090 145)"
  moss-bg: "oklch(0.93 0.030 145)"
  canvas: "oklch(0.965 0.012 90)"
  panel: "oklch(0.985 0.006 90)"
  elev: "#ffffff"
  sand: "oklch(0.93 0.022 85)"
  sand-deep: "oklch(0.87 0.035 80)"
  ink-900: "oklch(0.22 0.018 145)"
  ink-700: "oklch(0.36 0.020 140)"
  ink-500: "oklch(0.50 0.015 135)"
  ink-400: "oklch(0.52 0.013 130)"
  line: "oklch(0.91 0.012 100)"
  line-strong: "oklch(0.84 0.018 100)"
  urgent: "oklch(0.58 0.130 32)"
  high: "oklch(0.70 0.110 70)"
  med: "oklch(0.62 0.080 220)"
  low: "oklch(0.62 0.060 145)"
typography:
  display:
    fontFamily: "Geist, 'Thmanyah Serif Display', system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Geist, 'Thmanyah Serif Display', system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Geist, 'Thmanyah Serif Display', system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Geist, 'Thmanyah Serif Display', system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    letterSpacing: "0.01em"
  mono:
    fontFamily: "'Geist Mono', ui-monospace, 'SF Mono', Menlo, monospace"
    fontSize: "12px"
    fontWeight: 400
rounded:
  sm: "6px"
  md: "10px"
  lg: "14px"
  xl: "20px"
spacing:
  xs: "6px"
  sm: "10px"
  md: "14px"
  lg: "22px"
components:
  button-primary:
    backgroundColor: "{colors.forest}"
    textColor: "#fdf8ec"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
  button-primary-hover:
    backgroundColor: "{colors.forest-hi}"
  button-secondary:
    backgroundColor: "{colors.sand}"
    textColor: "{colors.ink-700}"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
  input:
    backgroundColor: "{colors.elev}"
    textColor: "{colors.ink-900}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
  card:
    backgroundColor: "{colors.elev}"
    textColor: "{colors.ink-900}"
    rounded: "{rounded.md}"
    padding: "14px"
  chip:
    backgroundColor: "{colors.elev}"
    textColor: "{colors.ink-700}"
    rounded: "999px"
    padding: "5px 10px"
---

# Design System: إدارة الخدمات المساندة

## 1. Overview

**Creative North Star: "The Operations Desk"**

This is the surface of a working desk in a support-services department, not a showcase. Everything a manager or field member needs for the current job sits within reach, laid out so the next action is obvious and nothing competes for attention it has not earned. The palette is earthy and grounded (forest green on warm off-white), the type is quiet, and the numbers are always Western so a bilingual team reads them the same way in Arabic and English.

Density is calm, not cramped. Screens carry real operational data (tasks, fuel logs, maintenance, supplier scores) without turning into a wall of identical tiles. Color is reserved: green marks the primary path, status hues (red, amber, blue, green) carry meaning, everything else stays neutral so the meaningful color reads instantly. The Arabic experience is the primary one, fully right-to-left, with Thmanyah carrying Arabic glyphs while Geist carries Latin text and digits.

What this system rejects: the generic card-grid SaaS look (endless identical icon-heading-text cards, the hero-metric template) and the cluttered government-portal feel (dense, disorganized, hard to scan). It also rejects decorative motion and flashy gradients. Components are tactile and confident: flat at rest, with a firm, physical response on press and a clear lift on hover.

**Key Characteristics:**
- Earthy forest-green primary on warm off-white; status color carries meaning, never decoration.
- Arabic-first, full RTL, Western numerals everywhere.
- Calm density: enough data to decide, never a tile wall.
- Tactile feedback: press depresses, hover lifts, focus rings are clear.
- Light and dark themes from one OKLCH token set.

## 2. Colors

An earthy, low-chroma palette: forest green leads, warm neutrals carry the surface, and four saturated status hues do the signalling.

### Primary
- **Forest** (`oklch(0.40 0.060 148)`): the brand green. Primary buttons, active nav, links, the brand mark, selected states. Carries roughly 10 percent of any screen, never more.
- **Forest Hi** (`oklch(0.48 0.075 148)`): hover/pressed state of primary actions.
- **Moss** (`oklch(0.62 0.090 145)`) and **Moss Bg** (`oklch(0.93 0.030 145)`): the lighter green and its tint, used for the active-item background, focus glow, and progress fills.

### Secondary (status)
- **Urgent** (`oklch(0.58 0.130 32)`): overdue, errors, destructive actions, high-priority flags.
- **High** (`oklch(0.70 0.110 70)`): warnings, review/awaiting states, due-soon.
- **Med** (`oklch(0.62 0.080 220)`): informational, scheduled.
- **Low** (`oklch(0.62 0.060 145)`): completed, healthy, valid. Each pairs with a matching `-bg` tint for chips and callouts.

### Neutral
- **Ink 900** (`oklch(0.22 0.018 145)`): primary text and headings.
- **Ink 700 / 500 / 400** (`0.36 / 0.50 / 0.52`): secondary text, meta, muted captions. Ink 400 is tuned to clear AA (≥4.5:1) on white for small text. Body text never drops below Ink 700 on tinted backgrounds.
- **Canvas** (`oklch(0.965 0.012 90)`): app background. **Panel** (`oklch(0.985 0.006 90)`): sidebars and bars. **Elev** (`#ffffff`): raised surfaces (cards, inputs, drawers). **Sand** (`oklch(0.93 0.022 85)`): secondary buttons, hover fills, inset tracks.
- **Line / Line Strong** (`0.91 / 0.84`): hairline borders and dividers.

### Named Rules
**The Reserved Green Rule.** Forest green marks the primary path only (one primary action, the active nav item, links). If green is on more than about 10 percent of a screen, it stops meaning "primary" and becomes decoration. Pull it back.

**The Meaningful Color Rule.** The four status hues are forbidden as decoration. A red is always urgent, an amber always needs attention. Never reach for them to "add color"; use a neutral tint instead.

## 3. Typography

**Display / Body Font:** Geist (with Thmanyah Serif Display for Arabic, then system-ui).
**Label/Mono Font:** Geist Mono (for IDs, plates, dates, money, any aligned figures).

**Character:** One quiet, modern family doing the work through weight and size, not through competing typefaces. The stack is ordered so Latin text and all digits render in Geist (Western numerals), while Arabic words fall through to Thmanyah. RTL flips the family order but keeps digits Western.

### Hierarchy
- **Display** (600, 20px, 1.2, -0.01em): page titles (the `.h` heading).
- **Title** (600, 16px, 1.3): panel and card titles, drawer headers.
- **Body** (400, 14px, 1.5): default text and form fields. Cap reading measure at 65 to 75ch.
- **Label** (500, 12px): field labels, nav, chips, meta.
- **Mono** (400, 12px): task IDs, plates, dates, currency, counts; anything that benefits from aligned figures.

### Named Rules
**The Western Numerals Rule.** All digits, in Arabic or English, are Western (1234567890), never Eastern-Arabic (٠١٢٣). The font stack and copy both enforce it; a stray ٥ is a bug.

**The Two-Step Scale Rule.** Hierarchy comes from weight plus a clear size step (roughly 1.25 between levels), not from many sizes. Display 20 over Body 14 over Label 12; do not add in-between sizes.

## 4. Elevation

A mostly flat system with tonal layering: depth comes from the Canvas / Panel / Elev background steps and hairline borders, not from heavy shadows. Shadows are a response to state, not a resting decoration, which keeps the "operations desk" calm. There is a small three-step shadow vocabulary plus a stronger one for overlays.

### Shadow Vocabulary
- **Shadow 1** (`0 1px 0 oklch(0.85 0.02 100 / 0.4), 0 1px 2px oklch(0.2 0.02 130 / 0.04)`): the faint seat under resting raised elements.
- **Shadow 2** (`0 1px 0 oklch(0.85 0.02 100 / 0.5), 0 6px 24px -8px oklch(0.2 0.02 130 / 0.10)`): hover lift on interactive cards and metrics.
- **Shadow Pop** (`0 10px 40px -10px oklch(0.2 0.04 140 / 0.18)`): popovers, the side drawer, and the slide-up mobile sheets.

### Named Rules
**The Flat-At-Rest Rule.** Surfaces are flat by default. A shadow appears only as a response to state: hover lifts (Shadow 2), overlays float (Shadow Pop). A card sitting still with a drop shadow is wrong; convey its grouping with the Elev background and a hairline border instead.

## 5. Components

Components are tactile and confident: flat at rest, firm on press (a small depress), clear on hover, with a visible focus ring. All transitions ease out and respect `prefers-reduced-motion`.

### Buttons
- **Shape:** gently rounded (6px, `rounded.sm`).
- **Primary:** Forest background, warm-white text (`#fdf8ec`), padding 10px 16px. Hover deepens to Forest Hi and lifts slightly; press scales to about 0.97.
- **Secondary:** Sand background, Ink 700 text, same shape. **Ghost:** transparent, Ink 700, hover fills Sand. **Danger:** Urgent.
- **Hover / Focus:** background and shadow transition over ~160ms ease-out; focus-visible shows a 2px Forest outline.

### Chips / Tags
- **Style:** pill (999px), Elev or status-tint background, Label type. A 6 to 8px status dot precedes the text so meaning is not color-only.
- **State:** filter pills switch to Moss Bg / Forest text / Moss border when active; on press they scale to ~0.96.

### Cards / Containers
- **Corner Style:** 10px (`rounded.md`); panels 14px (`rounded.lg`).
- **Background:** Elev on Canvas; **Border:** 1px Line. **Shadow Strategy:** flat at rest per the Flat-At-Rest Rule; Shadow 2 on hover when interactive.
- **Internal Padding:** 14px. Nested cards are forbidden.

### Inputs / Fields
- **Style:** 1px Line border, Elev background, 9px radius, 10px 12px padding, 14px text. Label above in Label type.
- **Focus:** border shifts to Moss with a 3px Moss Bg glow ring. **Select:** custom chevron that flips side under RTL.

### Navigation
- **Desktop:** left sidebar (Panel), Label-type items; active item gets Moss Bg background and Forest text/icon; hover fills Sand.
- **Mobile:** a fixed bottom tab bar (icons plus short labels, active in Forest, badges for counts) plus a slide-in "More" sheet reusing the sidebar. The desktop sidebar collapses to this; the analytics dashboard and ops modules stay off mobile by design.

### Signature: The Slide-Up Sheet
On phones the task detail and create/edit forms present as iOS-style bottom sheets: a grabber handle, rounded top, sticky header, momentum-scrolling body, a dimmed tap-to-dismiss backdrop, and safe-area padding. Popovers (settings, alerts, filters) follow the same sheet pattern on mobile so nothing anchors off-screen under RTL.

## 6. Do's and Don'ts

### Do:
- **Do** keep Forest green to ~10 percent of a screen (the Reserved Green Rule): one primary action, the active nav, links.
- **Do** use Western numerals (1234567890) everywhere, in both languages.
- **Do** keep body text at Ink 700 or darker on any tint; verify AA contrast (≥4.5:1 body, ≥3:1 large). No light-gray body text on warm off-white.
- **Do** pair every status with a dot or icon, not color alone.
- **Do** keep surfaces flat at rest; let hover lift and overlays float (the Flat-At-Rest Rule).
- **Do** test Arabic copy at every breakpoint for overflow; the viewport is part of the design.

### Don't:
- **Don't** build the generic card-grid SaaS look: endless identical icon-heading-text cards or the big-number hero-metric template. (PRODUCT.md anti-reference.)
- **Don't** drift toward a cluttered government-portal feel: dense, ungrouped, hard-to-scan screens. (PRODUCT.md anti-reference.)
- **Don't** use status hues (red/amber/blue/green) as decoration; they always carry meaning.
- **Don't** use side-stripe borders (a colored `border-left`/`border-right` over 1px) on cards, list rows, or callouts. Use a full border, a background tint, or a leading dot.
- **Don't** use gradient text, decorative glassmorphism, or bouncy/elastic motion.
- **Don't** ever render Eastern-Arabic numerals (٠١٢٣).
- **Don't** nest cards inside cards.
