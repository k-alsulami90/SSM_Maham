import Icon from "../components/Icon.jsx";
import Avatar from "../components/Avatar.jsx";
import TaskCard from "../components/TaskCard.jsx";
import { PriorityTag, StatusPill } from "../components/Tags.jsx";
import { MemberMetric } from "../components/DashWidgets.jsx";
import EmptyState from "../components/EmptyState.jsx";
import * as D from "../data/mock.js";
import { I18N } from "../data/i18n.js";
import { useStore } from "../store/AppStore.jsx";

/* Member dashboard — distraction-free "today's focus" of own tasks. */
export default function MemberDashboard({ onOpen, openId, onCreate, onNav }) {
  const { tasks, settings } = useStore();
  const { lang, currentUserId } = settings;
  const t = I18N[lang];

  const mine = tasks.filter((x) => x.assignee === currentUserId);
  const inProg = mine.filter((x) => x.status === "progress");
  const inReview = mine.filter((x) => x.status === "review");
  const backlog = mine.filter((x) => x.status === "backlog");
  const doneCount = mine.filter((x) => x.status === "done").length;

  return (
    <div className="content">
      <div className="page-header">
        <div>
          <h1 className="h">{t.today_focus}</h1>
          <p className="sub">
            {lang === "ar"
              ? `${inProg.length + backlog.length} مهمة نشطة، ${inReview.length} بالمراجعة`
              : `${inProg.length + backlog.length} active, ${inReview.length} in review`}
          </p>
        </div>
      </div>

      <div className="metric-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <MemberMetric icon="play" label={t.in_progress} value={inProg.length} hint={inProg[0] ? D.taskTitle(inProg[0], lang) : ""} onClick={() => onNav?.("hub")} />
        <MemberMetric icon="bolt" label={t.review_label} value={inReview.length} hint={lang === "ar" ? "بانتظار المدير" : "Awaiting manager"} />
        <MemberMetric icon="check" label={t.done_today} value={doneCount} hint={lang === "ar" ? "هذا الأسبوع" : "this week"} />
      </div>

      <h3 className="section-title" style={{ margin: "8px 0 10px", fontSize: 12 }}>{t.today_focus}</h3>
      {inProg.length + backlog.length === 0 ? (
        <EmptyState icon="tasks" title={lang === "ar" ? "لا مهام لك بعد" : "No tasks yet"} hint={lang === "ar" ? "عندما يُسنِد إليك المدير عملاً، سيظهر هنا مع موعده وأولويته." : "When your manager assigns work to you, it appears here with its due date and priority."} />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10, marginBottom: 18 }}>
          {[...inProg, ...backlog].slice(0, 4).map((tk) => (
            <TaskCard key={tk.id} task={tk} lang={lang} onOpen={onOpen} selected={openId === tk.id} />
          ))}
        </div>
      )}

      <h3 className="section-title" style={{ margin: "8px 0 10px", fontSize: 12 }}>{t.review_label}</h3>
      <div className="list-wrap">
        <div className="list-row header">
          <span></span>
          <span>{lang === "ar" ? "المهمة" : "Task"}</span>
          <span>{t.assignee}</span>
          <span>{t.due}</span>
          <span>{t.filter_status}</span>
          <span></span>
        </div>
        {[...inReview, ...mine.filter((x) => x.status === "done")].slice(0, 4).map((tk) => {
          const u = D.findUser(tk.assignee);
          const done = tk.status === "done";
          return (
            <div key={tk.id} className="list-row" onClick={() => onOpen(tk.id)}>
              <div className={`check ${done ? "done" : ""}`}>{done && <Icon name="check" size={10} strokeWidth={2.5} />}</div>
              <div className="ttl">
                <span className="mono" style={{ color: "var(--ink-300)", fontSize: 11, marginInlineEnd: 8 }}>{tk.id}</span>
                {D.taskTitle(tk, lang)}
                <span style={{ marginInlineStart: 8 }}><PriorityTag p={tk.priority} lang={lang} /></span>
              </div>
              <div className="who"><Avatar user={u} size={20} /><span style={{ fontSize: 12.5 }}>{D.userName(u, lang).split(" ")[0]}</span></div>
              <div className="due">{D.dueLabel(tk.due, lang)}</div>
              <div><StatusPill status={tk.status} lang={lang} /></div>
              <Icon name="more" size={14} className="dots" />
            </div>
          );
        })}
        {inReview.length + mine.filter((x) => x.status === "done").length === 0 && <div className="empty">{t.no_tasks}</div>}
      </div>
    </div>
  );
}
