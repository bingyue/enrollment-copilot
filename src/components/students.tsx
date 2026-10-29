'use client';
import { useState } from 'react';
import {
  GraduationCap,
  HeartHandshake,
  AlertCircle,
  Sprout,
  Sparkles,
  ArrowUpRight,
  CalendarPlus,
  PenLine,
  Loader2,
} from 'lucide-react';
import {
  useApp,
  PageHeading,
  Metric,
  Avatar,
  Badge,
  Progress,
  Empty,
  SectionTitle,
  request,
} from './shared';
import { Button } from './ui/button';
import { Modal } from './ui/dialog';
import { type Student } from '@/lib/schema';
import { operationAdvice } from '@/lib/domain';
import { dayLabel, dateKey } from '@/lib/utils';
type OperationResult = {
  summary: string;
  engine: string;
  actions: {
    studentId: string;
    priority: '高' | '中' | '低';
    reason: string;
    title: string;
    detail: string;
  }[];
};
export function Students() {
  const { data, mutate, toast, go } = useApp();
  const [filter, setFilter] = useState('全部学员');
  const [editing, setEditing] = useState<Student | null>(null);
  const [report, setReport] = useState<OperationResult | null>(null);
  const [busy, setBusy] = useState(false);
  const high = data.students.filter((s) => operationAdvice(s).priority === '高');
  const filtered = data.students.filter(
    (s) =>
      filter === '全部学员' ||
      (filter === '需要关注' && operationAdvice(s).priority === '高') ||
      (filter === '成长机会' && operationAdvice(s).tag === '成长机会') ||
      (filter === '新入学' && s.progress === 0),
  );
  const avg = data.students.length
    ? Math.round(data.students.reduce((n, s) => n + s.progress, 0) / data.students.length)
    : 0;
  async function analyze() {
    setBusy(true);
    try {
      setReport(await request('/api/operations', { method: 'POST' }));
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page">
      <PageHeading
        eyebrow="GROWTH DOESN’T END AT ENROLLMENT"
        title="报名之后，陪伴才刚刚开始"
        description="关注学习进展，也看见每个人真实的困难。"
        action={
          <Button onClick={analyze} disabled={busy}>
            {busy ? <Loader2 className="spin" size={16} /> : <Sparkles size={16} />}生成今日关注名单
          </Button>
        }
      />
      <div className="metrics-grid">
        <Metric
          label="在读学员"
          value={data.students.length}
          description="报名自动进入学员运营"
          icon={<GraduationCap size={19} />}
        />
        <Metric
          label="需要重点关注"
          value={high.length}
          description="低活跃或学习进度落后的学员"
          icon={<HeartHandshake size={19} />}
          color="rose"
        />
        <Metric
          label="平均学习进度"
          value={avg}
          suffix="%"
          description="基于顾问维护的课程完成情况"
          icon={<Sprout size={19} />}
          color="teal"
        />
        <Metric
          label="进阶与转介绍机会"
          value={data.students.filter((s) => operationAdvice(s).tag === '成长机会').length}
          description="先确认体验，再沟通下一步"
          icon={<Sparkles size={19} />}
          color="purple"
        />
      </div>
      <div className="insight-banner warm-banner">
        <div className="insight-icon">
          <HeartHandshake size={22} />
        </div>
        <div className="insight-copy">
          <strong>今天，先给这几位学员一点支持</strong>
          <p>
            {high.length
              ? `${high.map((s) => data.leads.find((l) => l.id === s.leadId)?.name).join('、')} 最近的学习投入偏低。先问问遇到了什么困难，再一起调整学习计划。`
              : '目前没有明显的掉队风险，记得为新学员安排入学引导。'}
          </p>
        </div>
        <Button variant="ghost" onClick={() => setFilter('需要关注')}>
          查看学员
          <ArrowUpRight size={16} />
        </Button>
      </div>
      <div className="panel student-panel">
        <div className="table-toolbar">
          <div className="tabs">
            {['全部学员', '需要关注', '新入学', '成长机会'].map((x) => (
              <button className={filter === x ? 'active' : ''} key={x} onClick={() => setFilter(x)}>
                {x}
              </button>
            ))}
          </div>
          <span className="muted tiny">进度由顾问记录 · 自动评估关注优先级</span>
        </div>
        <div className="student-grid">
          {filtered.map((s) => {
            const l = data.leads.find((l) => l.id === s.leadId)!;
            const c = data.courses.find((c) => c.id === s.courseId);
            const advice = operationAdvice(s);
            return (
              <div className="student-card" key={s.id}>
                <div className="student-card-top">
                  <Avatar name={l.name} index={data.leads.indexOf(l)} />
                  <div>
                    <h3>{l.name}</h3>
                    <p>{c?.name}</p>
                  </div>
                  <Badge
                    color={
                      advice.priority === '高'
                        ? 'rose'
                        : advice.tag === '成长机会'
                          ? 'teal'
                          : 'indigo'
                    }
                  >
                    {advice.tag}
                  </Badge>
                </div>
                <div className="student-progress">
                  <span>
                    学习进度 <b>{s.progress}%</b>
                  </span>
                  <Progress
                    value={s.progress}
                    color={advice.priority === '高' ? 'rose' : 'indigo'}
                  />
                </div>
                <div className="student-numbers">
                  <div>
                    <span>作业完成</span>
                    <strong>
                      {s.homework}
                      <small>%</small>
                    </strong>
                  </div>
                  <div>
                    <span>学习活跃度</span>
                    <strong>
                      {s.activity}
                      <small>%</small>
                    </strong>
                  </div>
                  <div>
                    <span>开课日期</span>
                    <strong className="date-value">{dayLabel(s.startsAt)}</strong>
                  </div>
                </div>
                <div className={`student-advice ${advice.priority === '高' ? 'risk' : ''}`}>
                  <Sparkles size={15} />
                  <p>{advice.reason}</p>
                </div>
                <div className="student-opportunities">
                  <span>续费：{s.renewal}</span>
                  <span>转介绍：{s.referral}</span>
                </div>
                <div className="student-card-actions">
                  <Button size="sm" variant="outline" onClick={() => setEditing(s)}>
                    <PenLine size={13} />
                    更新进展
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      if (
                        await mutate({
                          type: 'operationTask',
                          id: s.id,
                          title: advice.title,
                          detail: advice.detail,
                        })
                      )
                        toast('已加入今日学员运营任务');
                    }}
                  >
                    <CalendarPlus size={14} />
                    创建关怀任务
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
        {!filtered.length && (
          <Empty
            title="这个分组里还没有学员"
            description="在线索详情确认报名后，学员会自动出现在这里。"
            action={<Button onClick={() => go('leads')}>前往线索工作台</Button>}
          />
        )}
      </div>
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="更新学员学习进展"
        description="记录真实进展与反馈，让运营建议更贴近学员。"
      >
        {editing && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                await mutate({
                  type: 'student',
                  id: editing.id,
                  startsAt: editing.startsAt,
                  progress: editing.progress,
                  homework: editing.homework,
                  activity: editing.activity,
                  note: editing.note,
                  renewal: editing.renewal,
                  referral: editing.referral,
                })
              ) {
                setEditing(null);
                toast('学员进展已保存，关注建议已更新');
              }
            }}
          >
            <div className="form-grid">
              {(['progress', 'homework', 'activity'] as const).map((k, i) => (
                <label key={k}>
                  {['学习进度', '作业完成率', '活跃度'][i]}（%）
                  <input
                    type="number"
                    min={0}
                    max={100}
                    required
                    value={editing[k]}
                    onChange={(e) => setEditing({ ...editing, [k]: Number(e.target.value) })}
                  />
                </label>
              ))}
              <label>
                开课日期
                <input
                  type="date"
                  required
                  value={dateKey(editing.startsAt)}
                  onChange={(e) => {
                    if (e.target.value)
                      setEditing({
                        ...editing,
                        startsAt: new Date(e.target.value + 'T10:00:00+08:00').toISOString(),
                      });
                  }}
                />
              </label>
              <label>
                续费机会
                <select
                  value={editing.renewal}
                  onChange={(e) =>
                    setEditing({ ...editing, renewal: e.target.value as Student['renewal'] })
                  }
                >
                  {['待评估', '可推荐进阶', '已续费'].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label>
                转介绍机会
                <select
                  value={editing.referral}
                  onChange={(e) =>
                    setEditing({ ...editing, referral: e.target.value as Student['referral'] })
                  }
                >
                  {['待培育', '可邀约', '已转介绍'].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="form-field">
              学习反馈与关怀备注
              <textarea
                rows={3}
                value={editing.note}
                maxLength={1000}
                onChange={(e) => setEditing({ ...editing, note: e.target.value })}
              />
            </label>
            <div className="modal-footer">
              <Button type="submit">保存进展</Button>
            </div>
          </form>
        )}
      </Modal>
      <Modal
        open={!!report}
        onClose={() => setReport(null)}
        title="今日学员关注名单"
        description={report?.summary}
        wide
      >
        {report && (
          <>
            <div className="operation-report">
              {report.actions.map((a) => {
                const s = data.students.find((s) => s.id === a.studentId);
                const l = data.leads.find((l) => l.id === s?.leadId);
                return (
                  <div key={a.studentId}>
                    <div className="operation-report-title">
                      <strong>{l?.name}</strong>
                      <Badge
                        color={
                          a.priority === '高' ? 'rose' : a.priority === '中' ? 'amber' : 'teal'
                        }
                      >
                        {a.priority}优先级
                      </Badge>
                    </div>
                    <h4>{a.title}</h4>
                    <p>{a.reason}</p>
                    <small>{a.detail}</small>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        if (
                          await mutate({
                            type: 'operationTask',
                            id: a.studentId,
                            title: a.title,
                            detail: a.detail,
                          })
                        )
                          toast('已加入今日待办');
                      }}
                    >
                      <CalendarPlus size={13} />
                      生成运营待办
                    </Button>
                  </div>
                );
              })}
            </div>
            <div className="modal-footer">
              <Badge color="indigo">
                {report.engine === 'live' ? 'AI 模型分析' : '演示规则分析'}
              </Badge>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
