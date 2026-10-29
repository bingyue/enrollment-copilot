'use client';
import { useEffect, useState } from 'react';
import {
  Search,
  SlidersHorizontal,
  Plus,
  ArrowUpRight,
  ChevronRight,
  MessageSquare,
  UserRound,
  BookOpen,
  Clock3,
  Sparkles,
  Copy,
  Check,
  Send,
  RefreshCw,
  PenLine,
  CalendarDays,
  AlertCircle,
  CheckCircle2,
  Target,
  ArrowRight,
  FileText,
  GraduationCap,
  Loader2,
} from 'lucide-react';
import {
  useApp,
  Avatar,
  Grade,
  Stage,
  Badge,
  AiLabel,
  Empty,
  Progress,
  request,
  PageHeading,
} from './shared';
import { Button } from './ui/button';
import { Modal } from './ui/dialog';
import { type Lead, type Profile, type Course, type Workspace, stages } from '@/lib/schema';
import { dayLabel, timeLabel, money, dateKey } from '@/lib/utils';
import { metrics } from '@/lib/domain';
export function Leads() {
  const { data, selectedId, setSelectedId, search, setSearch, openImport } = useApp();
  const [filter, setFilter] = useState('全部');
  const [sort, setSort] = useState('priority');
  const filtered = data.leads
    .filter(
      (l) =>
        (filter === '全部' ||
          (filter === 'A 类' && l.analysis.grade === 'A') ||
          (filter === '已报名' && l.stage === '已报名') ||
          (filter === '流失' && l.stage === '流失') ||
          (filter === '待跟进' && !['已报名', '流失'].includes(l.stage))) &&
        `${l.name} ${l.analysis.profile.interest} ${l.owner} ${l.analysis.profile.goal}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort((a, b) =>
      sort === 'priority'
        ? b.analysis.score - a.analysis.score
        : b.createdAt.localeCompare(a.createdAt),
    );
  const lead = filtered.find((l) => l.id === selectedId) || filtered[0];
  const m = metrics(data);
  return (
    <div className="page leads-page">
      <PageHeading
        eyebrow="YOUR ADMISSIONS WORKSPACE"
        title="每位学员，都值得被认真理解"
        description="从第一句咨询，到一次适合的学习选择。"
        action={
          <Button onClick={openImport}>
            <Plus size={16} />
            录入新咨询
          </Button>
        }
      />
      <div className="workspace-summary">
        <span>
          <i className="live-dot" />
          全部线索 <b>{m.total}</b>
        </span>
        <span>
          高意向 <b className="text-amber">{m.high}</b>
        </span>
        <span>
          今日待办 <b className="text-indigo">{m.due}</b>
        </span>
        <span>
          成功报名 <b className="text-teal">{m.enrolled}</b>
        </span>
        <div className="workspace-summary-end">
          <span className="dot-indicator" />
          更懂学员的招生工作台
        </div>
      </div>
      <div className="sales-workspace">
        <section className="lead-list">
          <div className="lead-list-title">
            <h2>
              学员线索 <small>{filtered.length}</small>
            </h2>
            <select aria-label="线索排序" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="priority">意向优先</option>
              <option value="recent">最近录入</option>
            </select>
          </div>
          <div className="list-search">
            <Search size={15} />
            <input
              aria-label="搜索学员"
              placeholder="搜索姓名、课程、顾问"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="filter-pills">
            {['全部', 'A 类', '待跟进', '已报名', '流失'].map((f) => (
              <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>
                {f}
              </button>
            ))}
          </div>
          <div className="lead-list-scroll">
            {filtered.map((l, i) => (
              <button
                className={`lead-item ${l.id === lead?.id ? 'selected' : ''}`}
                key={l.id}
                onClick={() => setSelectedId(l.id)}
              >
                <div className="lead-item-top">
                  <Avatar name={l.name} index={data.leads.indexOf(l)} small />
                  <strong>{l.name}</strong>
                  <span className={l.analysis.score >= 80 ? 'text-amber' : 'text-indigo'}>
                    {l.analysis.score}
                    <small>分</small>
                  </span>
                </div>
                <p>
                  {l.analysis.profile.interest} <span>· {l.source}</span>
                </p>
                <div className="lead-item-bottom">
                  <Stage value={l.stage} />
                  <small>{dayLabel(l.updatedAt)}</small>
                </div>
              </button>
            ))}
            {!filtered.length && (
              <Empty title="没有匹配的学员" description="调整搜索词或筛选条件试试。" />
            )}
          </div>
          <div className="list-footer">{filtered.length} 条线索 · 数据已保存</div>
        </section>
        {lead ? (
          <LeadDetail key={lead.id} lead={lead} />
        ) : (
          <div className="workspace-empty">
            <Empty title="从一条咨询开始" action={<Button onClick={openImport}>录入咨询</Button>} />
          </div>
        )}
      </div>
    </div>
  );
}
function LeadDetail({ lead: l }: { lead: Lead }) {
  const { data, mutate, toast, replace, go } = useApp();
  const a = l.analysis;
  const [tab, setTab] = useState('沟通记录');
  const [copilot, setCopilot] = useState('行动建议');
  const [compose, setCompose] = useState('');
  const [role, setRole] = useState<'student' | 'advisor'>('advisor');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [edit, setEdit] = useState(false);
  const [profileEdit, setProfileEdit] = useState(false);
  const [enroll, setEnroll] = useState(false);
  const [courseId, setCourseId] = useState(a.matches[0]?.courseId || data.courses[0].id);
  const [viewCourse, setViewCourse] = useState<Course | null>(null);
  const tasks = data.tasks.filter((t) => t.leadId === l.id);
  const terminal = ['已报名', '流失'].includes(l.stage);
  async function reanalyze(current: Lead = l) {
    setLoading(true);
    try {
      const transcript = current.messages
        .filter((m) => m.role !== 'system')
        .map((m) => `${m.role === 'student' ? '学员' : '老师'}：${m.content}`)
        .join('\n');
      const r = await request<{ workspace: Workspace; leadId: string }>('/api/analyze', {
        method: 'POST',
        body: JSON.stringify({
          name: current.name,
          source: current.source,
          owner: current.owner,
          transcript: transcript.slice(-16000),
          leadId: current.id,
        }),
      });
      replace(r.workspace);
      toast('已根据最新沟通更新分析与跟进计划');
      return true;
    } catch (e) {
      toast((e as Error).message);
      return false;
    } finally {
      setLoading(false);
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(a.reply);
      toast('建议回复已复制');
    } catch {
      toast('浏览器未允许复制，请使用「采用回复」后手动选择复制');
    }
  }
  async function send() {
    if (!compose.trim()) return;
    setSending(true);
    const r = await mutate({ type: 'message', id: l.id, role, content: compose });
    if (r) {
      const refreshed = terminal
        ? false
        : await reanalyze(r.leads.find((item) => item.id === l.id) || l);
      setCompose('');
      if (terminal) toast('沟通记录已保存');
      else if (refreshed) toast('沟通记录已保存，销售建议已刷新');
    }
    setSending(false);
  }
  return (
    <>
      <section className="lead-detail">
        <div className="detail-heading">
          <div className="person-cell">
            <Avatar name={l.name} index={data.leads.indexOf(l)} />
            <div>
              <div className="name-row">
                <h2>{l.name}</h2>
                <Grade lead={l} />
              </div>
              <p>
                {a.profile.occupation} <span>·</span> {l.source} <span>·</span> {l.owner}
              </p>
            </div>
          </div>
          <button className="icon-button" aria-label="编辑线索信息" onClick={() => setEdit(true)}>
            <PenLine size={17} />
          </button>
        </div>
        <div className="detail-actions">
          <label>
            当前阶段
            <select
              aria-label="当前成交阶段"
              value={l.stage}
              disabled={l.stage === '已报名'}
              onChange={(e) => {
                const stage = e.target.value as Lead['stage'];
                if (stage === '已报名') {
                  setEnroll(true);
                  return;
                }
                if (stage === '流失') {
                  setEdit(true);
                  return;
                }
                mutate({
                  type: 'lead',
                  id: l.id,
                  name: l.name,
                  owner: l.owner,
                  notes: l.notes,
                  lostReason: l.lostReason,
                  stage,
                });
              }}
            >
              {stages.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          {l.stage === '已报名' ? (
            <Button size="sm" variant="soft" onClick={() => go('students')}>
              <GraduationCap size={14} />
              进入学员运营
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              disabled={l.stage === '流失'}
              onClick={() => setEnroll(true)}
            >
              <CheckCircle2 size={14} />
              确认报名
            </Button>
          )}
        </div>
        <div className="detail-tabs" role="tablist">
          {[
            { name: '沟通记录', icon: MessageSquare },
            { name: '学员画像', icon: UserRound },
            { name: '课程方案', icon: BookOpen },
            { name: '跟进计划', icon: CalendarDays },
          ].map(({ name, icon: Icon }) => (
            <button
              key={name}
              role="tab"
              aria-selected={tab === name}
              className={tab === name ? 'active' : ''}
              onClick={() => setTab(name)}
            >
              <Icon size={14} />
              {name}
            </button>
          ))}
        </div>
        <div className="detail-body">
          {tab === '沟通记录' && (
            <>
              <div className="profile-brief">
                <span className="ai-brief-icon">
                  <Sparkles size={16} />
                </span>
                <div>
                  <strong>这位学员想要什么</strong>
                  <p>{a.summary}</p>
                </div>
              </div>
              <div className="conversation-timeline">
                {l.messages.map((m, i) => (
                  <div key={m.id} className={`timeline-message message-${m.role}`}>
                    {m.role === 'system' ? (
                      <>
                        <span className="system-point" />
                        <p>{m.content}</p>
                        <small>{timeLabel(m.at)}</small>
                      </>
                    ) : (
                      <>
                        <div className="message-meta">
                          {m.role === 'student' ? (
                            <Avatar name={l.name} index={data.leads.indexOf(l)} small />
                          ) : (
                            <span className="advisor-avatar">{l.owner.slice(0, 1)}</span>
                          )}
                          <strong>{m.role === 'student' ? l.name : l.owner}</strong>
                          <Badge color={m.role === 'student' ? 'slate' : 'indigo'}>
                            {m.role === 'student' ? '学员' : '课程顾问'}
                          </Badge>
                          <time>
                            {dayLabel(m.at)} {timeLabel(m.at)}
                          </time>
                        </div>
                        <div className="message-content">{m.content}</div>
                      </>
                    )}
                  </div>
                ))}
              </div>
              {l.notes && (
                <div className="advisor-note">
                  <PenLine size={14} />
                  <div>
                    <strong>顾问备注</strong>
                    <p>{l.notes}</p>
                  </div>
                </div>
              )}
            </>
          )}
          {tab === '学员画像' && (
            <>
              <div className="tab-section-heading">
                <h3>结构化客户画像</h3>
                <Button size="sm" variant="ghost" onClick={() => setProfileEdit(true)}>
                  <PenLine size={13} />
                  人工校正
                </Button>
              </div>
              <div className="profile-grid">
                {[
                  ['身份', a.profile.identity],
                  ['年龄', a.profile.age === '待确认' ? '待确认' : a.profile.age + ' 岁'],
                  ['职业', a.profile.occupation],
                  ['当前基础', a.profile.foundation],
                  ['学习目标', a.profile.goal],
                  ['预算', a.profile.budget],
                  ['时间安排', a.profile.availability],
                  ['意向课程', a.profile.interest],
                  ['最大顾虑', a.profile.concern],
                  ['决策周期', a.profile.decisionCycle],
                  ['决策人', a.profile.decisionMaker],
                ].map(([k, v]) => (
                  <div key={k} className={k === '学习目标' || k === '时间安排' ? 'span-two' : ''}>
                    <span>{k}</span>
                    <strong className={v === '待确认' ? 'muted' : ''}>{v}</strong>
                  </div>
                ))}
              </div>
              {a.profile.missing.length > 0 && (
                <div className="notice notice-amber">
                  <AlertCircle size={17} />
                  <div>
                    <strong>下次沟通可以补充</strong>
                    <p>{a.profile.missing.join(' · ')}</p>
                  </div>
                </div>
              )}
              <div className="tab-section-heading">
                <h3>当前异议</h3>
              </div>
              {a.objections.length ? (
                a.objections.map((o) => (
                  <div className="objection-card" key={o.type}>
                    <Badge color="amber">{o.type}</Badge>
                    <blockquote>“{o.evidence}”</blockquote>
                    <p>{o.strategy}</p>
                  </div>
                ))
              ) : (
                <p className="muted">当前记录未发现明确异议，可继续了解需求。</p>
              )}
            </>
          )}
          {tab === '课程方案' && (
            <>
              <div className="tab-section-heading">
                <h3>为 {l.name} 定制的课程建议</h3>
                <AiLabel mode={a.engine} />
              </div>
              {a.matches.map((match, i) => {
                const c = data.courses.find((c) => c.id === match.courseId);
                return (
                  c && (
                    <div className={`recommended-course ${i === 0 ? 'best-match' : ''}`} key={c.id}>
                      <div className="course-rec-top">
                        <span className={`course-symbol tone-${c.color}`}>
                          <BookOpen size={20} />
                        </span>
                        <div>
                          <h3>{c.name}</h3>
                          <p>
                            {c.weeks} 周 · {c.format}
                          </p>
                        </div>
                        <Badge color={i === 0 ? 'indigo' : 'slate'}>{match.fit}% 适配</Badge>
                      </div>
                      <div className="match-reasons">
                        {match.reasons.map((r) => (
                          <p key={r}>
                            <CheckCircle2 size={14} />
                            {r}
                          </p>
                        ))}
                      </div>
                      {match.risks.length > 0 && (
                        <div className="match-risks">
                          {match.risks.map((r) => (
                            <p key={r}>
                              <AlertCircle size={13} />
                              {r}
                            </p>
                          ))}
                        </div>
                      )}
                      <div className="course-rec-bottom">
                        <strong>
                          {money(c.price)}
                          <small> / 全课程</small>
                        </strong>
                        <Button size="sm" variant="outline" onClick={() => setViewCourse(c)}>
                          查看课程资料
                          <ArrowUpRight size={13} />
                        </Button>
                      </div>
                    </div>
                  )
                );
              })}
              <h3 className="subheading">暂不优先推荐</h3>
              {a.excluded.map((x) => (
                <div className="excluded-course" key={x.courseId}>
                  <span>{data.courses.find((c) => c.id === x.courseId)?.name}</span>
                  <p>{x.reason}</p>
                </div>
              ))}
            </>
          )}
          {tab === '跟进计划' && (
            <>
              <div className="tab-section-heading">
                <h3>7 天跟进计划</h3>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={terminal}
                  onClick={() => mutate({ type: 'plan', id: l.id })}
                >
                  <Plus size={14} />
                  补齐待办
                </Button>
              </div>
              <div className="plan-list">
                {a.followUp.map((p, i) => {
                  const task = tasks.find(
                    (t) => t.kind === 'sales' && (t.planDay === p.day || t.title === p.title),
                  );
                  return (
                    <div className="plan-item" key={i}>
                      <span className={task?.done ? 'plan-dot done' : 'plan-dot'}>
                        {task?.done ? <Check size={13} /> : i + 1}
                      </span>
                      <div>
                        <div className="plan-time">
                          {p.day === 0 ? '录入当天' : `第 ${p.day} 天`}
                          {task && (
                            <span>
                              {dayLabel(task.due)} · {task.status}
                            </span>
                          )}
                        </div>
                        <h4>{task?.title || p.title}</h4>
                        <p>{task?.detail || p.detail}</p>
                        {task && !task.done && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              mutate({ type: 'task', id: task.id, status: '已联系', done: true })
                            }
                          >
                            <Check size={13} />
                            标记已完成
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {!a.followUp.length && (
                <Empty
                  title="已停止营销跟进"
                  description="尊重学员的联系意愿，不再生成后续招生任务。"
                />
              )}
              <div className="notice">
                <CalendarDays size={17} />
                <p>跟进计划已保存到销售待办，具体时间与话术请结合学员意愿调整。</p>
              </div>
            </>
          )}
        </div>
        {tab === '沟通记录' && (
          <div className="composer">
            <div className="composer-top">
              <label>
                <select
                  aria-label="沟通记录角色"
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'student' | 'advisor')}
                >
                  <option value="advisor">顾问沟通记录</option>
                  <option value="student">补充学员回复</option>
                </select>
              </label>
              <span>仅记录，不向外发送</span>
            </div>
            <textarea
              aria-label="沟通内容"
              value={compose}
              onChange={(e) => setCompose(e.target.value)}
              maxLength={8000}
              placeholder="记录本次沟通，或采用右侧的建议回复…"
            />
            <div className="composer-bottom">
              <span>
                <MessageSquare size={13} />
                保存后自动更新建议
              </span>
              <Button size="sm" disabled={!compose.trim() || sending} onClick={send}>
                {sending ? <Loader2 className="spin" size={14} /> : <Plus size={14} />}保存沟通记录
              </Button>
            </div>
          </div>
        )}
      </section>
      <aside className="copilot">
        <div className="copilot-heading">
          <span className="copilot-logo">
            <Sparkles size={18} />
          </span>
          <div>
            <h2>AI 销售助手</h2>
            <p>你的每一次跟进，都有好建议</p>
          </div>
          <i className="live-dot" />
        </div>
        <div className="copilot-tabs">
          {['行动建议', '评分依据'].map((t) => (
            <button className={copilot === t ? 'active' : ''} key={t} onClick={() => setCopilot(t)}>
              {t}
            </button>
          ))}
        </div>
        <div className="copilot-scroll">
          <div className="intent-card">
            <div>
              <span>当前意向评分</span>
              <strong>
                {a.score}
                <small>/ 100</small>
              </strong>
              <Grade lead={l} />
            </div>
            <div
              className="intent-gauge"
              style={{
                background: `conic-gradient(${a.grade === 'A' ? '#f3b149' : '#736be7'} ${a.score * 3.6}deg,#edeef4 0)`,
              }}
            >
              <div>
                <Target size={24} />
              </div>
            </div>
          </div>
          <p className="score-disclaimer">辅助判断 · 非经校准的成交概率</p>
          {copilot === '评分依据' ? (
            <>
              <h3 className="copilot-section-title">七个维度，看清意向</h3>
              <div className="score-factors">
                {a.factors.map((f) => (
                  <div key={f.name}>
                    <div>
                      <strong>{f.name}</strong>
                      <b>
                        {f.value}
                        <small> / {f.max}</small>
                      </b>
                    </div>
                    <Progress value={(f.value / f.max) * 100} />
                    <p>{f.reason}</p>
                  </div>
                ))}
              </div>
              <div className="notice tiny">
                <AlertCircle size={15} />
                <p>信息不足会降低评分。人工修改后会保留原始维度，方便复核。</p>
              </div>
              <Button variant="outline" className="full-width" onClick={() => setProfileEdit(true)}>
                <PenLine size={14} />
                校正画像与意向分
              </Button>
            </>
          ) : (
            <>
              <div className="next-action-card">
                <div>
                  <span>
                    <Target size={15} />
                    下一步行动
                  </span>
                  <Badge color="teal">建议优先</Badge>
                </div>
                <h3>{a.nextAction}</h3>
                <p>
                  {a.inviteTrial
                    ? '适合邀请体验，先确认学员可用时间'
                    : '先补充关键条件，建立适合的学习方案'}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="full-width"
                  disabled={terminal}
                  onClick={() => {
                    setTab('跟进计划');
                    mutate({ type: 'plan', id: l.id });
                  }}
                >
                  <CalendarDays size={14} />
                  查看跟进计划
                  <ChevronRight size={14} />
                </Button>
              </div>
              {a.objections[0] && (
                <div className="copilot-objection">
                  <div className="copilot-section-title">
                    <span>核心异议</span>
                    <Badge color="amber">{a.objections[0].type}</Badge>
                  </div>
                  <p>“{a.objections[0].evidence}”</p>
                  <small>{a.objections[0].strategy}</small>
                </div>
              )}
              <div className="reply-card">
                <div className="copilot-section-title">
                  <span>
                    <Sparkles size={14} />
                    建议下一句话
                  </span>
                  <button className="icon-button" aria-label="复制建议回复" onClick={copy}>
                    <Copy size={14} />
                  </button>
                </div>
                <p>{a.reply}</p>
                <div>
                  <Button
                    size="sm"
                    variant="soft"
                    onClick={() => {
                      setCompose(a.reply);
                      setRole('advisor');
                      setTab('沟通记录');
                      toast('已填入沟通编辑框，请按实际情况调整');
                    }}
                  >
                    <PenLine size={13} />
                    采用回复
                  </Button>
                  <button className="text-link" onClick={() => setProfileEdit(true)}>
                    调整话术
                  </button>
                </div>
              </div>
              <div className="copilot-materials">
                <h3 className="copilot-section-title">建议发送的资料</h3>
                {a.materials.map((x, i) => (
                  <button
                    key={x}
                    onClick={() =>
                      setViewCourse(
                        data.courses.find((c) => c.id === a.matches[0]?.courseId) || null,
                      )
                    }
                  >
                    <FileText size={15} />
                    <span>{x}</span>
                    <ArrowUpRight size={13} />
                  </button>
                ))}
              </div>
              <div className="copilot-signals">
                <span>
                  <i className={a.canQuote ? 'signal-yes' : 'signal-no'} />
                  {a.canQuote ? '适合沟通报价' : '报价前先确认条件'}
                </span>
                <span>
                  <i className={a.inviteTrial ? 'signal-yes' : 'signal-no'} />
                  {a.inviteTrial ? '可邀约试听' : '先了解需求'}
                </span>
              </div>
            </>
          )}
          <div className="copilot-caution">
            <AlertCircle size={13} />
            <p>
              不承诺就业或学习效果。
              {a.cautions.find((x) => x.startsWith('评分已')) || '建议由顾问确认后使用。'}
            </p>
          </div>
        </div>
        <div className="copilot-footer">
          <AiLabel mode={a.engine} />
          <Button
            size="sm"
            variant="ghost"
            disabled={loading || terminal}
            onClick={() => reanalyze()}
          >
            <RefreshCw size={13} className={loading ? 'spin' : ''} />
            {loading ? '分析中…' : '重新分析'}
          </Button>
        </div>
      </aside>
      <Modal
        open={enroll}
        onClose={() => setEnroll(false)}
        title={`确认 ${l.name} 的报名`}
        description="记录报名后，将自动创建学员档案与开课跟进任务。"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const w = await mutate({ type: 'enroll', id: l.id, courseId });
            if (w) {
              setEnroll(false);
              toast('报名已确认，已进入学员运营并创建入学提醒');
            }
          }}
        >
          <label className="form-field">
            报名课程
            <select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
              {data.courses
                .filter((c) => c.active)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {money(c.price)}
                  </option>
                ))}
            </select>
          </label>
          <div className="notice notice-teal">
            <CheckCircle2 size={18} />
            <div>
              <strong>报名后的工作会自动衔接</strong>
              <p>结束销售待办 · 建立学习档案 · 创建入学引导任务</p>
            </div>
          </div>
          <p className="muted tiny">
            此操作记录已确认的报名，不发起支付。默认开课日为 3 天后，请根据班期开课安排执行提醒。
          </p>
          <div className="modal-footer">
            <Button type="button" variant="outline" onClick={() => setEnroll(false)}>
              取消
            </Button>
            <Button type="submit">
              确认报名
              <ArrowRight size={15} />
            </Button>
          </div>
        </form>
      </Modal>
      <LeadEditor open={edit} onClose={() => setEdit(false)} lead={l} />
      <ProfileEditor open={profileEdit} onClose={() => setProfileEdit(false)} lead={l} />
      <CourseInfo course={viewCourse} onClose={() => setViewCourse(null)} />
    </>
  );
}
function LeadEditor({ open, onClose, lead }: { open: boolean; onClose: () => void; lead: Lead }) {
  const { mutate, toast } = useApp();
  const [form, setForm] = useState({
    name: lead.name,
    owner: lead.owner,
    notes: lead.notes,
    stage: lead.stage,
    lostReason: lead.lostReason,
  });
  useEffect(() => {
    if (open)
      setForm({
        name: lead.name,
        owner: lead.owner,
        notes: lead.notes,
        stage: lead.stage,
        lostReason: lead.lostReason,
      });
  }, [open, lead]);
  return (
    <Modal open={open} onClose={onClose} title="编辑学员线索">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (await mutate({ type: 'lead', id: lead.id, ...form })) {
            toast('线索信息已更新');
            onClose();
          }
        }}
      >
        <div className="form-grid">
          <label>
            姓名
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label>
            负责顾问
            <input
              required
              value={form.owner}
              onChange={(e) => setForm({ ...form, owner: e.target.value })}
            />
          </label>
        </div>
        <label className="form-field">
          当前阶段
          <select
            value={form.stage}
            disabled={lead.stage === '已报名'}
            onChange={(e) => setForm({ ...form, stage: e.target.value as Lead['stage'] })}
          >
            {stages
              .filter((s) => s !== '已报名' || lead.stage === '已报名')
              .map((s) => (
                <option key={s}>{s}</option>
              ))}
          </select>
        </label>
        {form.stage === '流失' && (
          <label className="form-field">
            流失原因
            <input
              required
              value={form.lostReason}
              onChange={(e) => setForm({ ...form, lostReason: e.target.value })}
              placeholder="例如：预算不匹配、暂停学习计划"
            />
          </label>
        )}
        <label className="form-field">
          顾问备注
          <textarea
            rows={4}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </label>
        <div className="modal-footer">
          <Button type="submit">保存修改</Button>
        </div>
      </form>
    </Modal>
  );
}
function ProfileEditor({
  open,
  onClose,
  lead,
}: {
  open: boolean;
  onClose: () => void;
  lead: Lead;
}) {
  const { mutate, toast } = useApp();
  const [profile, setProfile] = useState(lead.analysis.profile);
  const [reply, setReply] = useState(lead.analysis.reply);
  const [score, setScore] = useState(lead.analysis.score);
  useEffect(() => {
    if (open) {
      setProfile(lead.analysis.profile);
      setReply(lead.analysis.reply);
      setScore(lead.analysis.score);
    }
  }, [open, lead]);
  const keys: [keyof Profile, string][] = [
    ['identity', '学员身份'],
    ['age', '年龄'],
    ['occupation', '职业'],
    ['foundation', '当前基础'],
    ['goal', '学习目标'],
    ['budget', '预算说明'],
    ['availability', '时间安排'],
    ['interest', '意向课程'],
    ['concern', '核心顾虑'],
    ['decisionCycle', '决策周期'],
    ['decisionMaker', '决策人'],
  ];
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="人工校正分析"
      description="人工确认的画像字段将在重新分析时保留。手动评分会单独标记。"
      wide
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (await mutate({ type: 'profile', id: lead.id, profile, reply, score })) {
            toast('人工校正已保存');
            onClose();
          }
        }}
      >
        <div className="form-grid">
          {keys.map(([key, label]) => (
            <label key={key}>
              {label}
              <input
                value={String(profile[key] ?? '')}
                onChange={(e) => setProfile({ ...profile, [key]: e.target.value })}
              />
            </label>
          ))}
          <label>
            意向评分（0–100）
            <input
              type="number"
              min={0}
              max={100}
              value={score}
              onChange={(e) => setScore(Number(e.target.value))}
            />
          </label>
          <label>
            明确预算（元，未知留空）
            <input
              type="number"
              min={0}
              value={profile.budgetAmount ?? ''}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  budgetAmount: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
          </label>
          <label>
            每周可投入小时（未知留空）
            <input
              type="number"
              min={0}
              max={168}
              value={profile.hoursPerWeek ?? ''}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  hoursPerWeek: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
          </label>
        </div>
        <label className="form-field">
          建议回复
          <textarea
            rows={6}
            value={reply}
            maxLength={3000}
            onChange={(e) => setReply(e.target.value)}
          />
        </label>
        <div className="modal-footer">
          <Button type="submit">保存人工校正</Button>
        </div>
      </form>
    </Modal>
  );
}
export function CourseInfo({ course: c, onClose }: { course: Course | null; onClose: () => void }) {
  const { toast } = useApp();
  return (
    <Modal open={!!c} onClose={onClose} title={c?.name || '课程资料'} description={c?.subtitle}>
      {c && (
        <>
          <div className="course-info-meta">
            <strong>{money(c.price)}</strong>
            <Badge color="indigo">{c.weeks} 周</Badge>
            <Badge>{c.format}</Badge>
          </div>
          <div className="course-info-block">
            <h3>适合谁学习</h3>
            <p>{c.audience}</p>
            <h3>你将练习的能力</h3>
            <p>{c.goals}</p>
            <h3>学习投入与先修要求</h3>
            <p>
              每周建议 {c.hoursPerWeek} 小时。{c.prerequisites}
            </p>
            <h3>发展方向</h3>
            <p>{c.direction}</p>
            <h3>常见问题</h3>
            {c.faq.map((f) => (
              <div className="faq-item" key={f.question}>
                <strong>{f.question}</strong>
                <p>{f.answer}</p>
              </div>
            ))}
          </div>
          <div className="modal-footer">
            <Button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(
                    `${c.name}\n${c.subtitle}\n费用：${c.price}元，周期：${c.weeks}周\n方式：${c.format}\n每周投入：${c.hoursPerWeek}小时\n适合：${c.audience}\n学习目标：${c.goals}\n要求：${c.prerequisites}\n${c.faq.map((f) => f.question + '\n' + f.answer).join('\n')}`,
                  );
                  toast('课程资料已复制，可核对后发送给学员');
                } catch {
                  toast('复制权限未开启，请手动选择课程资料');
                }
              }}
            >
              <Copy size={15} />
              复制课程资料
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
