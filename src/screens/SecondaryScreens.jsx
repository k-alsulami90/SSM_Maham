import Icon from "../components/Icon.jsx";
import Avatar from "../components/Avatar.jsx";
import { WorkloadBar } from "../components/DashWidgets.jsx";
import { PriorityTag, StatusPill } from "../components/Tags.jsx";
import EmptyState from "../components/EmptyState.jsx";
import * as D from "../data/mock.js";
import { I18N } from "../data/i18n.js";
import { useStore } from "../store/AppStore.jsx";
import { useTaskActions } from "../store/useTaskActions.js";

/* ===== Manager · Approval queue (full page) ===== */
export function Approvals({ onOpen }) {
  const { tasks, settings } = useStore();
  const actions = useTaskActions();
  const { lang } = settings;
  const t = I18N[lang];
  const review = tasks.filter((x) => x.status === "review");

  return (
    <div className="content">
      <div className="page-header">
        <div>
          <h1 className="h">{t.approvals}</h1>
          <p className="sub">{review.length} {t.approvals_meta}</p>
        </div>
      </div>
      <div className="panel">
        <div className="queue">
          {review.map((task) => {
            const u = D.findUser(task.assignee);
            const p = D.findProject(task.project);
            return (
              <div className="queue-item review" key={task.id} onClick={() => onOpen(task.id)} style={{ cursor: "pointer" }}>
                <div className="ico"><Icon name="bolt" size={14} /></div>
                <div className="body">
                  <div className="title">
                    <span className="mono" style={{ color: "var(--ink-400)", fontSize: 11 }}>{task.id}</span>
                    {D.taskTitle(task, lang)}
                  </div>
                  <div className="meta">
                    <span className="who"><Avatar user={u} size={14} /> {D.userName(u, lang)}</span>
                    <span>·</span>
                    <span>{t.in} <b style={{ color: "var(--ink-700)" }}>{D.projectName(p, lang)}</b></span>
                  </div>
                </div>
                <div className="acts" onClick={(e) => e.stopPropagation()}>
                  {task.type === "procurement" && !task.selectedQuotationId ? (
                    <button className="approve" onClick={() => onOpen(task.id)}>
                      <Icon name="quote" size={12} /> {t.review_quotations} ({(task.quotations || []).length})
                    </button>
                  ) : (
                    <>
                      <button className="reject" onClick={() => onOpen(task.id)}><Icon name="reject" size={12} /> {t.reject}</button>
                      <button className="approve" onClick={() => actions.approve(task)}><Icon name="check" size={12} /> {t.approve}</button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
          {review.length === 0 && (
            <EmptyState icon="approve" title={lang === "ar" ? "لا شيء بانتظار الاعتماد" : "Nothing to approve"} hint={lang === "ar" ? "عندما يرفع أحد أعضاء الفريق عملًا للمراجعة، سيظهر هنا." : "When a team member submits work for review, it appears here."} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ===== Recurring duties — templates with cadence, streak, and this-period status ===== */
export function RecurringDuties({ onOpen, onCreate }) {
  const { tasks, templates, settings } = useStore();
  const { lang, role, currentUserId } = settings;
  const t = I18N[lang];
  const visible = role === "manager" ? templates : templates.filter((tpl) => tpl.assignee === currentUserId);

  return (
    <div className="content">
      <div className="page-header">
        <div>
          <h1 className="h">{t.recurring_duties}</h1>
          <p className="sub">{t.duties_meta}</p>
        </div>
        {role === "manager" && (
          <div className="actions">
            <button className="btn btn-primary" onClick={onCreate}><Icon name="plus" size={13} /> {t.new_recurring}</button>
          </div>
        )}
      </div>
      <div className="list-wrap">
        <div className="list-row header" style={{ gridTemplateColumns: "1fr 130px 110px 90px 90px" }}>
          <span>{lang === "ar" ? "المهمة" : "Duty"}</span>
          <span>{t.assignee}</span>
          <span>{t.repeats}</span>
          <span>{t.streak}</span>
          <span>{t.this_period}</span>
        </div>
        {visible.map((tpl) => {
          const u = D.findUser(tpl.assignee);
          const pk = D.periodKey(tpl.recurrence.freq);
          const inst = tasks.find((x) => x.templateId === tpl.id && x.periodKey === pk);
          const done = inst?.status === "done";
          const streak = D.computeStreak(tpl.history, tpl.recurrence.freq);
          return (
            <div
              key={tpl.id}
              className="list-row"
              style={{ gridTemplateColumns: "1fr 130px 110px 90px 90px" }}
              onClick={() => inst && onOpen(inst.id)}
            >
              <div className="ttl">
                <Icon name="repeat" size={13} style={{ marginInlineEnd: 8, color: "var(--ink-400)", verticalAlign: -2 }} />
                {lang === "ar" ? tpl.ar_title : tpl.title}
              </div>
              <div className="who"><Avatar user={u} size={20} /><span style={{ fontSize: 12.5 }}>{D.userName(u, lang).split(" ")[0]}</span></div>
              <div style={{ fontSize: 12.5, color: "var(--ink-700)" }}>{D.recurrenceLabel(tpl.recurrence, lang)}</div>
              <div className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 4, color: streak > 0 ? "var(--acc-forest)" : "var(--ink-400)" }}>
                <Icon name="flame" size={12} /> {streak}
              </div>
              <div>
                <span style={{ fontSize: 11.5, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: done ? "var(--acc-moss-bg)" : "var(--bg-sand)", color: done ? "var(--acc-forest)" : "var(--ink-500)" }}>
                  {done ? t.done_state : t.pending}
                </span>
              </div>
            </div>
          );
        })}
        {visible.length === 0 && (
          <EmptyState
            icon="repeat"
            title={lang === "ar" ? "لا مهام متكررة بعد" : "No recurring duties yet"}
            hint={lang === "ar" ? "أنشئ المهام اليومية والأسبوعية والشهرية المتكررة، وتابع سلسلة الإنجاز." : "Set up daily, weekly and monthly recurring duties and track the completion streak."}
            actionLabel={role === "manager" ? t.new_recurring : undefined}
            onAction={role === "manager" ? onCreate : undefined}
          />
        )}
      </div>
    </div>
  );
}

/* ===== Manager · Team workload ===== */
export function Team() {
  const { tasks, settings } = useStore();
  const { lang } = settings;
  const t = I18N[lang];
  const members = D.getUsers().filter((u) => u.role === "member");
  const maxWl = Math.max(1, ...members.map((u) => tasks.filter((tk) => tk.assignee === u.id).length));
  return (
    <div className="content">
      <div className="page-header">
        <div>
          <h1 className="h">{t.team}</h1>
          <p className="sub">{t.workload_meta}</p>
        </div>
      </div>
      <div className="panel">
        <div className="workload" style={{ paddingTop: 16 }}>
          {members.map((u) => (
            <WorkloadBar key={u.id} user={u} tasks={tasks} lang={lang} max={maxWl} />
          ))}
        </div>
        <div className="legend">
          <span className="swatch"><span className="dot" style={{ background: "oklch(0.86 0.025 80)" }} />{D.statusLabel("backlog", lang)}</span>
          <span className="swatch"><span className="dot" style={{ background: "oklch(0.75 0.06 145)" }} />{D.statusLabel("progress", lang)}</span>
          <span className="swatch"><span className="dot" style={{ background: "oklch(0.78 0.08 70)" }} />{D.statusLabel("review", lang)}</span>
          <span className="swatch"><span className="dot" style={{ background: "oklch(0.55 0.07 148)" }} />{D.statusLabel("done", lang)}</span>
        </div>
      </div>
    </div>
  );
}

/* ===== Global activity feed (aggregated across tasks) ===== */
export function ActivityFeed({ onOpen }) {
  const { tasks, settings } = useStore();
  const { lang } = settings;
  const t = I18N[lang];
  const feed = [];
  tasks.forEach((tk) => (tk.activity || []).forEach((a, i) => feed.push({ ...a, task: tk, key: tk.id + "-" + i })));
  feed.reverse();

  return (
    <div className="content">
      <div className="page-header">
        <div>
          <h1 className="h">{t.activity}</h1>
          <p className="sub">{lang === "ar" ? "آخر التحديثات عبر الفريق" : "Latest updates across the team"}</p>
        </div>
      </div>
      <div className="panel" style={{ padding: "16px 18px" }}>
        <div className="activity">
          {feed.slice(0, 40).map((a) => {
            const who = D.findUser(a.who);
            return (
              <div className="entry" key={a.key}>
                {a.kind === "system" ? (
                  <div className="av system"><Icon name="activity" size={11} /></div>
                ) : (
                  <span className="av" style={{ background: who?.color }}>{who?.initials}</span>
                )}
                <div className={`bub ${a.kind === "system" ? "system" : ""}`}>
                  <span className="who">{D.userName(who, lang)}</span> {lang === "ar" ? a.ar : a.text}
                  {" · "}
                  <button onClick={() => onOpen(a.task.id)} style={{ color: "var(--acc-forest)", fontWeight: 500 }}>
                    {a.task.id}
                  </button>
                  <span className="when">{a.at}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ===== Member · Inbox (assigned + in-review items) ===== */
export function Inbox({ onOpen }) {
  const { tasks, settings } = useStore();
  const { lang, currentUserId } = settings;
  const t = I18N[lang];
  const mine = tasks.filter((x) => x.assignee === currentUserId && x.status !== "done");

  return (
    <div className="content">
      <div className="page-header">
        <div>
          <h1 className="h">{t.inbox}</h1>
          <p className="sub">{mine.length} {lang === "ar" ? "عناصر تحتاج انتباهك" : "items need your attention"}</p>
        </div>
      </div>
      <div className="list-wrap">
        <div className="list-row header" style={{ gridTemplateColumns: "28px 1fr 120px 90px 36px" }}>
          <span></span>
          <span>{lang === "ar" ? "المهمة" : "Task"}</span>
          <span>{t.due}</span>
          <span>{t.filter_status}</span>
          <span></span>
        </div>
        {mine.map((tk) => {
          const overdue = D.daysUntil(tk.due) < 0;
          return (
            <div key={tk.id} className="list-row" style={{ gridTemplateColumns: "28px 1fr 120px 90px 36px" }} onClick={() => onOpen(tk.id)}>
              <div className="check" />
              <div className="ttl">
                <span className="mono" style={{ color: "var(--ink-300)", fontSize: 11, marginInlineEnd: 8 }}>{tk.id}</span>
                {D.taskTitle(tk, lang)}
                <span style={{ marginInlineStart: 8 }}><PriorityTag p={tk.priority} lang={lang} /></span>
              </div>
              <div className={`due ${overdue ? "overdue" : ""}`}>{D.dueLabel(tk.due, lang)}</div>
              <div><StatusPill status={tk.status} lang={lang} /></div>
              <Icon name="more" size={14} className="dots" />
            </div>
          );
        })}
        {mine.length === 0 && (
          <EmptyState icon="inbox" title={lang === "ar" ? "صندوقك خالٍ" : "Your inbox is clear"} hint={lang === "ar" ? "المهام التي تحتاج انتباهك ستظهر هنا." : "Tasks that need your attention will show up here."} />
        )}
      </div>
    </div>
  );
}
