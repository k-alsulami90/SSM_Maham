import Icon from "./Icon.jsx";
import { I18N } from "../data/i18n.js";
import { useStore } from "../store/AppStore.jsx";

/* Bottom navigation for the mobile/PWA experience. Reuses the same screens as
   desktop (driven by onNav) so there's no duplicated UI — only app-style chrome.
   Managers get a center "+" FAB to create; the "More" tab opens the side menu. */
export default function MobileTabBar({ active, moreOpen, onNav, onMore, onCreate, counts }) {
  const { settings } = useStore();
  const { lang, role } = settings;
  const t = I18N[lang];
  const isManager = role === "manager";

  const Tab = ({ id, icon, label, count, onClick, on }) => (
    <button
      className={`mtab ${on ?? active === id ? "active" : ""}`}
      onClick={onClick || (() => onNav(id))}
      aria-label={label}
      aria-current={(on ?? active === id) ? "page" : undefined}
    >
      <span className="mtab-ic">
        <Icon name={icon} size={21} />
        {count > 0 && <span className="mtab-badge">{count > 99 ? "99+" : count}</span>}
      </span>
      <span className="mtab-lbl">{label}</span>
    </button>
  );

  const more = lang === "ar" ? "المزيد" : "More";
  return (
    <nav className="mob-tabbar" aria-label={t.workspace}>
      {isManager ? (
        <>
          <Tab id="hub" icon="kanban" label={t.task_hub} />
          <Tab id="approvals" icon="approve" label={t.approvals} count={counts.review} />
          <button className="mtab-fab" onClick={onCreate} aria-label={t.new_task}>
            <Icon name="plus" size={24} strokeWidth={2.4} />
          </button>
          <Tab id="activity" icon="activity" label={t.activity} />
          <Tab id="more" icon="list" label={more} onClick={onMore} on={moreOpen} />
        </>
      ) : (
        <>
          <Tab id="dashboard" icon="tasks" label={t.my_tasks} count={counts.mine} />
          <Tab id="hub" icon="kanban" label={t.task_hub} />
          <Tab id="inbox" icon="inbox" label={t.inbox} count={counts.review} />
          <Tab id="more" icon="list" label={more} onClick={onMore} on={moreOpen} />
        </>
      )}
    </nav>
  );
}
