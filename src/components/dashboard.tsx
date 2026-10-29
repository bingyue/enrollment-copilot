'use client';
import { useMemo, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Clock3,
  Flame,
  Plus,
  Sparkles,
  Target,
  Users,
  CalendarDays,
  ChevronDown,
  ChartNoAxesCombined,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  useApp,
  Avatar,
  Grade,
  Stage,
  Badge,
  SectionTitle,
  TextLink,
  PageHeading,
  Metric,
  Empty,
  Progress,
} from './shared';
import { Button } from './ui/button';
import { metrics } from '@/lib/domain';
import { dateKey, addDays, dayLabel } from '@/lib/utils';
export function Dashboard() {
  const { data, go, openImport, mutate } = useApp();
  const m = metrics(data);
  const [period, setPeriod] = useState('today');
  const priority = data.leads
    .filter((l) => !['已报名', '流失'].includes(l.stage))
    .sort((a, b) => b.analysis.score - a.analysis.score)
    .slice(0, 5);
  const due = data.tasks.filter((t) => !t.done && dateKey(t.due) <= dateKey()).slice(0, 4);
  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const day = addDays(new Date(), i - 6);
        return {
          date: new Date(day).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }),
          咨询: data.leads.filter((l) => dateKey(l.createdAt) === dateKey(day)).length,
          报名: data.leads.filter((l) => l.enrolledAt && dateKey(l.enrolledAt) === dateKey(day))
            .length,
        };
      }),
    [data],
  );
  const currentNew =
    period === 'today'
      ? m.newToday
      : data.leads.filter((l) => l.createdAt >= addDays(new Date(), -7)).length;
  const funnel = [
    { label: '全部咨询', n: data.leads.length, color: '#8d88ef' },
    { label: '有效线索', n: m.valid, color: '#726ce6' },
    {
      label: '明确课程意向',
      n: data.leads.filter((l) => !['新线索', '需求了解', '流失'].includes(l.stage)).length,
      color: '#5c55d9',
    },
    {
      label: '报价 / 待决策',
      n: data.leads.filter((l) => ['报价', '待决策', '已报名'].includes(l.stage)).length,
      color: '#4f46e5',
    },
    { label: '成功报名', n: m.enrolled, color: '#10b981' },
  ];
  return (
    <div className="page dashboard-page">
      <PageHeading
        eyebrow="MAKE EVERY CONVERSATION COUNT"
        title="今天哪些学员最值得跟进？"
        description="把每一次真诚的沟通，变成学员成长的起点。"
        action={
          <div className="heading-actions">
            <label className="select-button">
              <CalendarDays size={16} />
              <select
                aria-label="统计时间范围"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              >
                <option value="today">今日概览</option>
                <option value="week">近 7 天</option>
              </select>
              <ChevronDown size={14} />
            </label>
            <Button onClick={openImport}>
              <Plus size={16} />
              录入新咨询
            </Button>
          </div>
        }
      />
      <div className="metrics-grid">
        <Metric
          label={period === 'today' ? '今日新增线索' : '近 7 天新增线索'}
          value={currentNew}
          description={`线索池共 ${m.total} 位潜在学员`}
          icon={<Users size={19} />}
        />
        <Metric
          label="高意向线索"
          value={m.high}
          description="A 类学员，值得优先沟通"
          icon={<Flame size={19} />}
          color="amber"
        />
        <Metric
          label="今日待办"
          value={m.due}
          description="含今日与逾期待跟进任务"
          icon={<Clock3 size={19} />}
          color="purple"
        />
        <Metric
          label="累计成功报名"
          value={m.enrolled}
          suffix="人"
          description={`咨询 → 报名转化率 ${m.conversion}%`}
          icon={<Target size={19} />}
          color="teal"
        />
      </div>
      <div className="insight-banner">
        <div className="insight-icon">
          <Sparkles size={22} />
        </div>
        <div className="insight-copy">
          <div>
            <strong>今天的招生洞察</strong>
            <Badge color="indigo">基于工作区数据</Badge>
          </div>
          <p>
            今日新增 <b>{m.newToday}</b> 条咨询，其中 <b>{m.highToday}</b> 条高意向；
            <b>{m.price}</b> 位学员存在价格顾虑。建议先跟进{' '}
            <b>{priority[0]?.name || '高意向学员'}</b>，用课程方案和试听帮助决策。
          </p>
        </div>
        <Button variant="ghost" onClick={() => go('leads')}>
          开始跟进
          <ArrowRight size={16} />
        </Button>
        <div className="banner-decoration" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
      <div className="dashboard-columns">
        <div className="panel priority-panel">
          <SectionTitle
            title="优先跟进学员"
            subtitle="综合意向、课程匹配与当前顾虑排序"
            action={<TextLink onClick={() => go('leads')}>全部线索</TextLink>}
          />
          <div className="table-scroll">
            <table className="crm-table">
              <thead>
                <tr>
                  <th>学员</th>
                  <th>意向课程</th>
                  <th>意向评分</th>
                  <th>当前阶段</th>
                  <th>下一步行动</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {priority.map((l, i) => (
                  <tr key={l.id} onClick={() => go('leads', l.id)}>
                    <td>
                      <div className="person-cell">
                        <Avatar name={l.name} index={i} />
                        <div>
                          <strong>{l.name}</strong>
                          <small>
                            {l.source} · {l.owner}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="course-name">
                        {data.courses.find((c) => c.id === l.analysis.matches[0]?.courseId)?.name}
                      </span>
                    </td>
                    <td>
                      <div className="score-cell">
                        <strong className={l.analysis.score >= 80 ? 'text-amber' : 'text-indigo'}>
                          {l.analysis.score}
                        </strong>
                        <span>/ 100</span>
                      </div>
                      <Grade lead={l} />
                    </td>
                    <td>
                      <Stage value={l.stage} />
                    </td>
                    <td>
                      <span className="action-cell">
                        {l.analysis.objections.some((o) => o.type === '价格异议')
                          ? '沟通课程价值与预算'
                          : l.analysis.inviteTrial
                            ? '邀请体验课程'
                            : '完善学习需求'}
                      </span>
                    </td>
                    <td>
                      <button aria-label={`跟进${l.name}`} className="row-arrow">
                        <ArrowUpRight size={17} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!priority.length && <Empty title="当前没有待跟进线索" />}
          <div className="panel-footer">
            <span className="live-dot" />
            每个分数都有依据，每次跟进都有方向<span className="muted">意向分数为辅助判断</span>
          </div>
        </div>
        <div className="panel daily-tasks">
          <SectionTitle title="今日跟进" action={<Badge color="indigo">{m.due} 项</Badge>} />
          {due.length ? (
            due.map((t) => {
              const l = data.leads.find((l) => l.id === t.leadId);
              return (
                <div className="mini-task" key={t.id}>
                  <button
                    className="check-box"
                    aria-label={`完成${t.title}`}
                    onClick={() => mutate({ type: 'task', id: t.id, status: '已联系', done: true })}
                  >
                    <Check size={13} />
                  </button>
                  <div onClick={() => go('leads', t.leadId)}>
                    <strong>{t.title}</strong>
                    <p>
                      {l?.name} <span>· {l?.owner}</span>
                    </p>
                  </div>
                  <span className={dateKey(t.due) < dateKey() ? 'text-rose' : 'muted'}>
                    {dateKey(t.due) < dateKey() ? '逾期' : dayLabel(t.due)}
                  </span>
                </div>
              );
            })
          ) : (
            <Empty title="今日跟进已完成" description="给每一位学员的认真回应，都值得被看见。" />
          )}
          <Button variant="ghost" className="full-width task-bottom" onClick={() => go('tasks')}>
            查看全部任务
            <ArrowRight size={15} />
          </Button>
        </div>
      </div>
      <div className="dashboard-bottom">
        <div className="panel funnel-panel">
          <SectionTitle
            title="招生转化漏斗"
            subtitle="当前线索池的阶段分布"
            action={<span className="muted tiny">累计</span>}
          />
          <div className="funnel-content">
            <div className="funnel-bars">
              {funnel.map((x, i) => (
                <div className="funnel-row" key={x.label}>
                  <span>{x.label}</span>
                  <div className="funnel-track">
                    <div
                      style={{
                        width: `${Math.max(14, (x.n / Math.max(1, m.total)) * 100)}%`,
                        background: x.color,
                      }}
                    >
                      <b>{x.n}</b>
                    </div>
                  </div>
                  <small>{i === 0 ? '100' : Math.round((x.n / Math.max(1, m.total)) * 100)}%</small>
                </div>
              ))}
            </div>
            <div className="funnel-summary">
              <div
                className="conversion-ring"
                style={{ background: `conic-gradient(#4f46e5 ${m.conversion * 3.6}deg,#eeedf8 0)` }}
              >
                <div>
                  <strong>
                    {m.conversion}
                    <small>%</small>
                  </strong>
                  <span>整体转化率</span>
                </div>
              </div>
              <p>
                平均成交周期 <b>{m.cycle}</b> 天
              </p>
            </div>
          </div>
        </div>
        <div className="panel trend-panel">
          <SectionTitle
            title="咨询与报名趋势"
            subtitle="近 7 天 · 按实际录入日期统计"
            action={
              <div className="chart-legend">
                <span>
                  <i />
                  咨询
                </span>
                <span>
                  <i />
                  报名
                </span>
              </div>
            }
          />
          <div className="trend-chart">
            <ResponsiveContainer width="100%" height={175}>
              <AreaChart data={days} margin={{ top: 5, right: 15, left: -28, bottom: 0 }}>
                <defs>
                  <linearGradient id="leadFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7770e8" stopOpacity={0.19} />
                    <stop offset="100%" stopColor="#7770e8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 5" vertical={false} stroke="#eceff3" />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#8b94a6' }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                  tick={{ fontSize: 10, fill: '#8b94a6' }}
                />
                <Tooltip
                  contentStyle={{ border: '1px solid #eee', borderRadius: 12, fontSize: 12 }}
                />
                <Area
                  isAnimationActive={false}
                  type="monotone"
                  dataKey="咨询"
                  stroke="#7168df"
                  strokeWidth={2.5}
                  fill="url(#leadFill)"
                />
                <Area
                  isAnimationActive={false}
                  type="monotone"
                  dataKey="报名"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="transparent"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <div className="dashboard-bottom">
        <div className="panel">
          <SectionTitle
            title="课程转化表现"
            subtitle="按当前推荐课程归属统计，报名以实际课程为准"
          />
          {data.courses.map((c) => {
            const n = data.students.filter((s) => s.courseId === c.id).length;
            const leadIds = new Set([
              ...data.leads
                .filter((l) => l.analysis.matches[0]?.courseId === c.id)
                .map((l) => l.id),
              ...data.students.filter((s) => s.courseId === c.id).map((s) => s.leadId),
            ]);
            return (
              <div className="course-rank" key={c.id}>
                <div>
                  <span className={`course-dot tone-${c.color}`}>
                    <ChartNoAxesCombined size={15} />
                  </span>
                  <strong>{c.name}</strong>
                </div>
                <Progress value={leadIds.size ? (n / leadIds.size) * 100 : 0} />
                <span>
                  {n} / {leadIds.size} <small>报名</small>
                </span>
              </div>
            );
          })}
        </div>
        <div className="panel">
          <SectionTitle title="流失原因" subtitle="用真实反馈，找到下一次沟通的改进空间" />
          {Array.from(
            new Set(
              data.leads.filter((l) => l.stage === '流失').map((l) => l.lostReason || '未记录'),
            ),
          ).map((reason) => {
            const n = data.leads.filter(
              (l) => l.stage === '流失' && (l.lostReason || '未记录') === reason,
            ).length;
            return (
              <div className="loss-row" key={reason}>
                <span>{reason}</span>
                <Progress
                  value={(n / data.leads.filter((l) => l.stage === '流失').length) * 100}
                  color="rose"
                />
                <b>{n}</b>
              </div>
            );
          })}
        </div>
      </div>
      <p className="page-caption">知遇 · 好的招生，从理解一个人开始。</p>
    </div>
  );
}
