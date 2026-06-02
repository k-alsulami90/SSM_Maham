import Icon from "../components/Icon.jsx";
import Avatar from "../components/Avatar.jsx";
import { Sparkline } from "../components/Tags.jsx";
import { MetricCard, WorkloadBar, Donut } from "../components/DashWidgets.jsx";
import * as D from "../data/mock.js";
import { I18N } from "../data/i18n.js";
import { useStore } from "../store/AppStore.jsx";
import { useTaskActions } from "../store/useTaskActions.js";

/* Manager dashboard — metrics, bottleneck callout, workload, status donut, approval queue. */
export default function ManagerDashboard({ onOpen, onNav }) {
  const { tasks, settings } = useStore();
  const actions = useTaskActions();
  const { lang, currentUserId } = settings;
  const t = I18N[lang];
  const currentUser = D.findUser(currentUserId);

  // Procurement insight: committed spend = sum of selected quotations.
  const procurement = tasks.filter((x) => x.type === "procurement");
  const selectedQuotes = procurement
    .filter((x) => x.selectedQuotationId)
    .map((x) => ({ task: x, q: (x.quotations || []).find((q) => q.id === x.selectedQuotationId) }))
    .filter((x) => x.q);
  const committed = selectedQuotes.reduce((sum, x) => sum + (Number(x.q.amount) || 0), 0);
  const committedCurrency = selectedQuotes[0]?.q.currency || D.CURRENCY;
  const pendingSelection = procurement.filter((x) => x.status === "review" && !x.selectedQuotationId).length;

  const activeN = tasks.filter((x) => x.status !== "done").length;
  const total = tasks.length;
  const done = tasks.filter((x) => x.status === "done").length;
  const review = tasks.filter((x) => x.status === "review");
  const overdue = tasks.filter((x) => x.status !== "done" && D.daysUntil(x.due) < 0).length;

  const breakdownData = [
    { s: "backlog", color: "oklch(0.78 0.025 80)" },
    { s: "progress", color: "oklch(0.62 0.080 200)" },
    { s: "review", color: "oklch(0.70 0.110 70)" },
    { s: "done", color: "oklch(0.55 0.075 148)" },
  ].map((x) => ({ ...x, n: tasks.filter((tk) => tk.status === x.s).length, label: D.statusLabel(x.s, lang) }));

  const members = D.getUsers().filter((u) => u.role === "member");
  const maxWl = Math.max(1, ...members.map((u) => tasks.filter((tk) => tk.assignee === u.id).length));

  return (
    <div className="content dashboard">
      <div className="page-header">
        <div>
          <h1 className="h">{t.morning}, {D.userName(currentUser, lang).split(" ")[0]}</h1>
          <p className="sub">
            {lang === "ar"
              ? `لديك ${review.length} مهام بانتظار مراجعتك و ${overdue} مهام متأخرة.`
              : `You have ${review.length} tasks awaiting review and ${overdue} overdue items.`}
          </p>
        </div>
      </div>

      <div className="metric-grid">
        <MetricCard icon="layers" label={t.metric_active} value={activeN} delta="+3 this week" deltaDir="up" spark={<Sparkline points={[6, 8, 7, 9, 11, 10, 12]} />} onClick={() => onNav("hub")} />
        <MetricCard icon="check" label={t.metric_completion} value={Math.round((done / total) * 100)} unit="%" delta="+8%" deltaDir="up" spark={<Sparkline points={[62, 64, 66, 70, 72, 74, 78]} color="var(--acc-moss)" />} />
        <MetricCard icon="clock" label={t.metric_overdue} value={overdue} delta={lang === "ar" ? "بحاجة لمتابعة" : "needs follow-up"} deltaDir="flat" spark={<Sparkline points={[2, 3, 3, 4, 3, 3, 4]} color="var(--hue-urgent)" />} onClick={() => onNav("hub")} />
        <MetricCard icon="bolt" label={t.metric_review} value={review.length} delta={lang === "ar" ? "بحاجة لإجراء" : "action needed"} deltaDir="flat" spark={<Sparkline points={[1, 1, 2, 2, 3, 2, 3]} color="var(--hue-high)" />} onClick={() => onNav("approvals")} />
      </div>

      <div className="callout" style={{ marginBottom: 18 }}>
        <Icon name="flame" size={16} />
        <div>
          <b>{t.bottlenecks}: </b>
          {t.bottleneck_msg}
        </div>
        <button className="btn btn-ghost" style={{ marginInlineStart: "auto", color: "var(--acc-forest)", fontWeight: 600 }} onClick={() => onNav("approvals")}>
          {t.open_queue} <Icon name="arrow_right" size={12} />
        </button>
      </div>

      <div className="dash-split">
        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="title">{t.workload_title}</div>
              <div className="meta">{t.workload_meta}</div>
            </div>
          </div>
          <div className="workload">
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

        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="title">{t.breakdown_title}</div>
              <div className="meta">{lang === "ar" ? "المهام عبر مساحة العمل" : "Tasks across the workspace"}</div>
            </div>
          </div>
          <div className="donut-card">
            <div className="donut"><Donut data={breakdownData} /></div>
            <div className="breakdown">
              {breakdownData.map((d) => (
                <div className="row" key={d.s}>
                  <span className="swatch" style={{ background: d.color }} />
                  <span className="name">{d.label}</span>
                  <span className="num">{d.n} · {total ? Math.round((d.n / total) * 100) : 0}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {procurement.length > 0 && (
        <div className="panel" style={{ marginTop: 18 }}>
          <div className="panel-head">
            <div>
              <div className="title">{t.procurement_title}</div>
              <div className="meta">{selectedQuotes.length} {t.selected_vendors} · {pendingSelection} {t.pending_selection}</div>
            </div>
            <div className="right" style={{ textAlign: "end" }}>
              <div style={{ fontSize: 11, color: "var(--ink-400)" }}>{t.committed_spend}</div>
              <div className="mono" style={{ fontSize: 18, fontWeight: 600, color: "var(--acc-forest)" }}>{D.fmtMoney(committed, committedCurrency)}</div>
            </div>
          </div>
          <div className="queue">
            {selectedQuotes.map(({ task, q }) => (
              <div className="queue-item" key={task.id} onClick={() => onOpen(task.id)} style={{ cursor: "pointer" }}>
                <div className="ico" style={{ background: "var(--acc-moss-bg)", color: "var(--acc-forest)" }}><Icon name="quote" size={14} /></div>
                <div className="body">
                  <div className="title">
                    <span className="mono" style={{ color: "var(--ink-400)", fontSize: 11 }}>{task.id}</span>
                    {D.taskTitle(task, lang)}
                  </div>
                  <div className="meta"><Icon name="check" size={11} /> {D.quotationVendor(q, lang)}</div>
                </div>
                <div className="mono" style={{ fontWeight: 600, fontSize: 13 }}>{D.fmtMoney(q.amount, q.currency)}</div>
              </div>
            ))}
            {selectedQuotes.length === 0 && <div className="empty">{lang === "ar" ? "لا عروض مختارة بعد" : "No quotations selected yet"}</div>}
          </div>
        </div>
      )}

      <div className="panel" style={{ marginTop: 18 }}>
        <div className="panel-head">
          <div>
            <div className="title">{t.approvals_title}</div>
            <div className="meta">{review.length} {t.approvals_meta}</div>
          </div>
          <div className="right">
            <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => onNav("approvals")}>
              {t.view_all} <Icon name="chev_right" size={12} />
            </button>
          </div>
        </div>
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
                    <span>{t.submitted} <span className="mono">{task.activity.slice(-1)[0]?.at}</span></span>
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
          {review.length === 0 && <div className="empty">{t.nothing_review}</div>}
        </div>
      </div>
    </div>
  );
}
