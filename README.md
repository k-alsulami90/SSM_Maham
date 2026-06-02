# Mahām · Task Management PWA

A bilingual (English / العربية, with full RTL), earthy-minimal team task-management
**Progressive Web App** — manager & member workflows, an approvals queue, a kanban/list
task hub with a detail drawer, document upload, and offline support.

Built as a real, installable app from the Claude Design handoff (`Mahām · Task Management PWA.html`).

## Run it

```bash
npm install
npm run dev        # local dev server
npm run build      # production build → dist/
npm run preview    # serve the production build
npm test           # run the unit test suite (Vitest)
```

> If you change the brand icons, regenerate the PNGs with `node scripts/gen-icons.mjs`.

## What's implemented

- **RBAC** — the interface adapts to the signed-in role. Switch between **Manager**
  and **Member** from the sidebar user card (desktop) or the *Me* tab (mobile).
- **Manager dashboard** — live metrics (active tasks, completion rate, overdue,
  awaiting review), a bottleneck callout, team-workload bars, a status donut, and an
  approval queue with one-click approve / reject.
- **Member dashboard** — distraction-free "today's focus" of assigned tasks, with
  progress and quick actions (move to in-progress, submit for review).
- **Task hub** — kanban board with **drag-and-drop** between status columns, a sortable
  list view, and project / assignee / priority filters.
- **Task detail drawer** — fields, role-aware actions, an editable subtask checklist,
  a **Documents** section (click-to-pick **and** drag-and-drop upload), an activity
  timeline, and a comment composer.
- **Create-task modal** — title, description, and chip selectors for priority, project,
  assignee, and due date.
- **Mobile-first** — below 760px the app switches to a native-feeling layout with a
  sticky bottom tab bar and a floating create button.
- **Bilingual + theming** — EN/AR toggle with RTL mirroring, plus four accent palettes
  (forest, clay, indigo, slate).
- **PWA** — web manifest, generated icons, and a Workbox service worker
  (`vite-plugin-pwa`) for offline use and install. State persists to `localStorage`.

## Architecture

```
src/
  data/        mock domain data (mock.js) + bilingual strings (i18n.js)
  store/       AppStore.jsx — single useReducer source of truth + localStorage
  components/  Icon, Avatar, Tags, TaskCard, Kanban, ListView, FilterBar,
               DocumentsSection, DetailDrawer, CreateTaskModal, Sidebar, Topbar,
               DashWidgets
  screens/     ManagerDashboard, MemberDashboard, TaskHub, SecondaryScreens
               (Approvals, Team, ActivityFeed, Inbox)
  mobile/      MobileApp.jsx — responsive phone layout + bottom tab bar
  App.jsx      shell: role-aware nav, drawer & modal orchestration, PWA install
```

All mutations flow through one reducer (`SET_STATUS`, `TOGGLE_SUBTASK`, `ADD_COMMENT`,
`ADD_ATTACHMENTS`, `CREATE_TASK`, …) so the UI updates instantly and the task
"database" is mirrored to `localStorage` for offline continuity. Reset the demo data
anytime from the user menu.
