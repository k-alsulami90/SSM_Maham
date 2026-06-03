import { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar.jsx";
import Topbar from "./components/Topbar.jsx";
import DetailDrawer from "./components/DetailDrawer.jsx";
import CreateTaskModal from "./components/CreateTaskModal.jsx";
import ManagerDashboard from "./screens/ManagerDashboard.jsx";
import MemberDashboard from "./screens/MemberDashboard.jsx";
import TaskHub from "./screens/TaskHub.jsx";
import { Approvals, Team, ActivityFeed, Inbox, RecurringDuties } from "./screens/SecondaryScreens.jsx";
import { FleetDashboard, Vehicles } from "./screens/Fleet.jsx";
import { AssetsDashboard, AssetRegister, AssetView } from "./screens/Assets.jsx";
import ProjectView from "./screens/ProjectView.jsx";
import Users from "./screens/Users.jsx";
import Suppliers from "./screens/Suppliers.jsx";
import Maintenance from "./screens/Maintenance.jsx";
import { useAuth } from "./auth/AuthProvider.jsx";
import CommandPalette from "./components/CommandPalette.jsx";
import MobileTabBar from "./components/MobileTabBar.jsx";
import Icon from "./components/Icon.jsx";
import { I18N, ACCENTS } from "./data/i18n.js";
import { findProject, projectName } from "./data/mock.js";
import { useStore } from "./store/AppStore.jsx";

const MOBILE_QUERY = "(max-width: 760px)";

function useIsMobile() {
  const [m, setM] = useState(() => (typeof window !== "undefined" ? window.matchMedia(MOBILE_QUERY).matches : false));
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const on = (e) => setM(e.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return m;
}

/* PWA install prompt capture. */
function useInstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault();
      setDeferred(e);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", () => setDeferred(null));
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);
  const promptInstall = async () => {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  };
  return [!!deferred, promptInstall];
}

export default function App() {
  const { tasks, templates, settings, dispatch } = useStore();
  const { lang, accent, theme, role, currentUserId } = settings;
  const t = I18N[lang];
  const auth = useAuth();
  const isMobile = useIsMobile();

  // When real auth is active, the signed-in profile drives the role
  // (admin & manager → full UI; member → restricted). Local mode is unaffected.
  useEffect(() => {
    if (!auth.configured || !auth.profile) return;
    const mapped = auth.role === "member" ? "member" : "manager";
    if (settings.role !== mapped) dispatch({ type: "SET_SETTING", key: "role", value: mapped });
    // Use the real signed-in user id so "my tasks" / assignee filtering is correct.
    if (settings.currentUserId !== auth.profile.id) dispatch({ type: "SET_SETTING", key: "currentUserId", value: auth.profile.id });
  }, [auth.configured, auth.role, auth.profile, settings.role, settings.currentUserId, dispatch]);
  const [canInstall, promptInstall] = useInstallPrompt();

  const [screen, setScreen] = useState("dashboard");
  const [openId, setOpenId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [openVehicleId, setOpenVehicleId] = useState(null);
  const [openAssetId, setOpenAssetId] = useState(null);
  const [openProjectId, setOpenProjectId] = useState(null);
  const [offline, setOffline] = useState(() => (typeof navigator !== "undefined" ? !navigator.onLine : false));

  // Reflect language on <html> (dir + lang).
  useEffect(() => {
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, [lang]);

  // Swap accent palette via CSS variables.
  useEffect(() => {
    const [a, b, c, d] = ACCENTS[accent] || ACCENTS.forest;
    const r = document.documentElement.style;
    r.setProperty("--acc-forest", a);
    r.setProperty("--acc-forest-hi", b);
    r.setProperty("--acc-moss", c);
    r.setProperty("--acc-moss-bg", d);
  }, [accent]);

  // Light / dark theme.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Global UI size — scales the whole app (text, spacing, controls) uniformly.
  // `zoom` is non-standard and breaks viewport height + fixed positioning on
  // mobile browsers (content ends up half off-screen), so it's desktop-only.
  useEffect(() => {
    if (isMobile) { document.documentElement.style.zoom = ""; return; }
    const scale = { s: 1, m: 1.12, l: 1.26 }[settings.uiSize] || 1.12;
    document.documentElement.style.zoom = String(scale);
  }, [settings.uiSize, isMobile]);

  // Online/offline awareness.
  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  // Global shortcuts: ⌘K / Ctrl+K palette, "c" create, "/" search.
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target.tagName || "").toLowerCase();
      const typing = tag === "input" || tag === "textarea" || tag === "select" || e.target.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
        return;
      }
      if (typing || paletteOpen || showModal) return;
      if (e.key === "c" && role === "manager") { e.preventDefault(); setShowModal(true); }
      else if (e.key === "/") { e.preventDefault(); setPaletteOpen(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paletteOpen, showModal, role]);

  // Keep selected screen valid when the role changes.
  useEffect(() => {
    // Mobile is intentionally task-focused — no dashboards / ops modules.
    let allowed;
    if (isMobile) {
      allowed = role === "manager"
        ? ["hub", "approvals", "recurring", "activity"]
        : ["dashboard", "hub", "inbox", "recurring", "activity"];
    } else {
      allowed = role === "manager"
        ? ["dashboard", "hub", "approvals", "recurring", "team", "activity", "fleet", "vehicles", "assets", "register", "project", "suppliers", "maintenance"]
        : ["dashboard", "hub", "recurring", "inbox", "activity"];
      if (auth.role === "admin") allowed.push("users");
    }
    if (!allowed.includes(screen)) setScreen(allowed[0]);
  }, [role, screen, auth.role, isMobile]);

  const counts = {
    review: tasks.filter((x) => x.status === "review").length,
    mine: tasks.filter((x) => x.assignee === currentUserId && x.status !== "done").length,
  };

  const nav = (s) => {
    setScreen(s);
    setNavOpen(false);
    setOpenVehicleId(null);
    setOpenAssetId(null);
    setOpenProjectId(null);
  };

  const openProject = (id) => {
    setOpenProjectId(id);
    setScreen("project");
    setNavOpen(false);
  };

  const addProject = () => {
    const name = window.prompt(lang === "ar" ? "اسم المشروع الجديد:" : "New project name:");
    if (name && name.trim()) {
      dispatch({ type: "ADD_PROJECT", project: { id: "p" + Date.now().toString(36), name: name.trim(), ar: name.trim() } });
    }
  };

  const openVehicle = (id) => {
    setOpenVehicleId(id);
    setScreen("vehicles");
    setNavOpen(false);
  };

  const openAsset = (id) => {
    setOpenAssetId(id);
    setScreen("register");
    setNavOpen(false);
  };

  const handleCreate = (data) => {
    if (data.type === "recurring") {
      const id = "R-" + (templates.length + 1) + "-" + Date.now().toString(36);
      dispatch({
        type: "CREATE_TEMPLATE",
        template: {
          id,
          type: "recurring",
          title: data.title,
          ar_title: data.title,
          desc: data.desc,
          ar_desc: data.desc,
          recurrence: data.recurrence,
          assignee: data.assignee,
          project: data.project,
          priority: data.priority,
          history: [],
        },
      });
      setShowModal(false);
      setScreen("recurring");
      return;
    }
    const id = "T-" + (104 + tasks.length + 1);
    dispatch({
      type: "CREATE_TASK",
      task: {
        id,
        type: data.type || "assignment",
        title: data.title,
        ar_title: data.title,
        desc: data.desc,
        ar_desc: data.desc,
        project: data.project,
        priority: data.priority,
        assignee: data.assignee,
        status: "backlog",
        due: data.due,
        created: "2026-05-28",
        progress: 0,
        attachments: [],
        subtasks: [],
        quotations: [],
        selectedQuotationId: null,
        activity: [{ kind: "system", who: "u1", at: "Today", text: "created this task", ar: "أنشأ المهمة" }],
      },
    });
    setShowModal(false);
    setOpenId(id);
  };

  const crumbsFor = {
    dashboard: [t.workspace, role === "manager" ? t.dashboard : t.my_tasks],
    hub: [t.workspace, t.task_hub],
    approvals: [t.workspace, t.approvals],
    recurring: [t.workspace, t.recurring_duties],
    team: [t.workspace, t.team],
    activity: [t.workspace, t.activity],
    inbox: [t.workspace, t.inbox],
    fleet: [t.assets, t.fleet_dashboard],
    vehicles: [t.assets, t.vehicles],
    assets: [t.assets, t.assets_dashboard],
    register: [t.assets, t.asset_register],
    maintenance: [t.assets, t.maintenance],
    suppliers: [t.assets, t.suppliers],
    users: [t.settings, lang === "ar" ? "المستخدمون" : "Users"],
  };
  const crumbs =
    screen === "project" && openProjectId
      ? [t.projects, projectName(findProject(openProjectId), lang)]
      : crumbsFor[screen] || crumbsFor.dashboard;

  const renderScreen = () => {
    const p = { onOpen: setOpenId, openId, onNav: nav, onCreate: () => setShowModal(true) };
    switch (screen) {
      case "hub":
        return <TaskHub {...p} />;
      case "approvals":
        return <Approvals {...p} />;
      case "recurring":
        return <RecurringDuties {...p} />;
      case "team":
        return <Team {...p} />;
      case "activity":
        return <ActivityFeed {...p} />;
      case "inbox":
        return <Inbox {...p} />;
      case "fleet":
        return <FleetDashboard onOpenVehicle={openVehicle} />;
      case "vehicles":
        return <Vehicles openVehicleId={openVehicleId} onOpenVehicle={openVehicle} onBack={() => setOpenVehicleId(null)} />;
      case "assets":
        return <AssetsDashboard onOpenVehicle={openVehicle} onOpenAsset={openAsset} />;
      case "register":
        return openAssetId
          ? <AssetView assetId={openAssetId} onBack={() => setOpenAssetId(null)} />
          : <AssetRegister onOpenVehicle={openVehicle} onOpenAsset={openAsset} onNav={nav} />;
      case "project":
        return <ProjectView projectId={openProjectId} onOpenTask={setOpenId} onOpenVehicle={openVehicle} onOpenAsset={openAsset} onBack={() => nav("dashboard")} />;
      case "suppliers":
        return <Suppliers />;
      case "maintenance":
        return <Maintenance />;
      case "users":
        return <Users />;
      case "dashboard":
      default:
        return role === "manager" ? <ManagerDashboard {...p} /> : <MemberDashboard {...p} />;
    }
  };

  const drawer = openId && (
    <>
      {isMobile && <div className="sheet-scrim" onClick={() => setOpenId(null)} />}
      <DetailDrawer taskId={openId} lang={lang} onClose={() => setOpenId(null)} />
    </>
  );
  const modal = showModal && <CreateTaskModal lang={lang} onClose={() => setShowModal(false)} onCreate={handleCreate} />;
  const palette = paletteOpen && (
    <CommandPalette
      onClose={() => setPaletteOpen(false)}
      onOpenTask={setOpenId}
      onNav={nav}
      onCreate={() => setShowModal(true)}
    />
  );
  const banner = offline && (
    <div className="offline-banner"><Icon name="bell" size={13} /> {t.offline_banner}</div>
  );

  return (
    <div className={`app-shell ${isMobile ? "is-mobile" : ""} ${navOpen ? "nav-open" : ""}`}>
      {navOpen && <div className="nav-scrim" onClick={() => setNavOpen(false)} />}
      <Sidebar active={screen} onNav={nav} onOpenProject={openProject} onAddProject={addProject} counts={counts} onClose={() => setNavOpen(false)} isMobile={isMobile} />
      <div className="main">
        {banner}
        <Topbar
          crumbs={crumbs}
          isMobile={isMobile}
          onNew={() => setShowModal(true)}
          onMenu={() => setNavOpen(true)}
          onSearch={() => setPaletteOpen(true)}
          onOpenTask={setOpenId}
          canInstall={canInstall}
          onInstall={promptInstall}
        />
        {renderScreen()}
      </div>
      {isMobile && (
        <MobileTabBar
          active={screen}
          moreOpen={navOpen}
          onNav={nav}
          onMore={() => setNavOpen(true)}
          onCreate={() => setShowModal(true)}
          counts={counts}
        />
      )}
      {drawer}
      {modal}
      {palette}
    </div>
  );
}
