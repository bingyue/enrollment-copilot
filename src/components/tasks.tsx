'use client';
import { useState } from 'react';
import {
  CalendarDays,
  Check,
  Clock3,
  ListChecks,
  ArrowUpRight,
  Search,
  PenLine,
  Download,
  CheckCircle2,
} from 'lucide-react';
import { useApp, PageHeading, Metric, Avatar, Badge, Empty } from './shared';
import { Button } from './ui/button';
import { Modal } from './ui/dialog';
import type { Task } from '@/lib/schema';
import { dateKey, dayLabel, addDays, csvCell } from '@/lib/utils';
export function downloadFile(name: string, content: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function Tasks() {
  const { data, go, mutate, toast, busy } = useApp();
  const [filter, setFilter] = useState('今日待办');
  const [kind, setKind] = useState('全部');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Task | null>(null);
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [due, setDue] = useState('');
  const today = dateKey();
  const outstanding = data.tasks.filter((t) => !t.done);
  const filtered = data.tasks
    .filter(
      (t) =>
        (kind === '全部' || t.kind === (kind === '招生跟进' ? 'sales' : 'operation')) &&
        (filter === '全部任务' ||
          (filter === '已完成' && t.done) ||
          (filter === '今日待办' && !t.done && dateKey(t.due) <= today) ||
          (filter === '未来 7 天' &&
            !t.done &&
            dateKey(t.due) > today &&
            dateKey(t.due) <= dateKey(addDays(new Date(), 7)))) &&
        `${t.title} ${data.leads.find((l) => l.id === t.leadId)?.name}`.includes(search),
    )
    .sort((a, b) => a.due.localeCompare(b.due));
  function edit(t: Task) {
    setEditing(t);
    setTitle(t.title);
    setDetail(t.detail);
    setDue(dateKey(t.due));
  }
  function exportCsv() {
    const content = [
      ['学员', '顾问', '任务', '说明', '日期', '状态', '完成'],
      ...filtered.map((t) => {
        const l = data.leads.find((l) => l.id === t.leadId);
        return [
          l?.name,
          l?.owner,
          t.title,
          t.detail,
          dateKey(t.due),
          t.status,
          t.done ? '是' : '否',
        ];
      }),
    ]
      .map((row) => row.map(csvCell).join(','))
      .join('\r\n');
    downloadFile('知遇-跟进任务.csv', '\ufeff' + content, 'text/csv;charset=utf-8');
    toast('当前筛选的任务已导出');
  }
  return (
    <div className="page">
      <PageHeading
        eyebrow="EVERY FOLLOW-UP HAS A PURPOSE"
        title="把好建议，变成实际行动"
        description="一个清晰的下一步，比十次漫无目的的联系更有用。"
        action={
          <Button variant="outline" onClick={exportCsv}>
            <Download size={16} />
            导出任务
          </Button>
        }
      />
      <div className="metrics-grid">
        <Metric
          label="今日待跟进"
          value={outstanding.filter((t) => dateKey(t.due) <= today).length}
          description="含需要补上的逾期任务"
          icon={<CalendarDays size={19} />}
        />
        <Metric
          label="等待回复"
          value={outstanding.filter((t) => t.status === '待回复').length}
          description="给学员一点认真思考的时间"
          icon={<Clock3 size={19} />}
          color="amber"
        />
        <Metric
          label="已完成任务"
          value={data.tasks.filter((t) => t.done).length}
          description="每一次及时回应，都在积累信任"
          icon={<CheckCircle2 size={19} />}
          color="teal"
        />
        <Metric
          label="未来 7 天待办"
          value={
            outstanding.filter(
              (t) => dateKey(t.due) > today && dateKey(t.due) <= dateKey(addDays(new Date(), 7)),
            ).length
          }
          description="为接下来的沟通留好时间"
          icon={<ListChecks size={19} />}
          color="purple"
        />
      </div>
      <div className="panel">
        <div className="table-toolbar">
          <div className="tabs">
            {['今日待办', '未来 7 天', '全部任务', '已完成'].map((t) => (
              <button className={filter === t ? 'active' : ''} onClick={() => setFilter(t)} key={t}>
                {t}
              </button>
            ))}
          </div>
          <div className="toolbar-controls">
            <div className="list-search">
              <Search size={15} />
              <input
                aria-label="搜索任务"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索任务或学员"
              />
            </div>
            <select aria-label="任务类型" value={kind} onChange={(e) => setKind(e.target.value)}>
              {['全部', '招生跟进', '学员运营'].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </div>
        </div>
        {filtered.length ? (
          <div className="task-table">
            {filtered.map((t) => {
              const l = data.leads.find((l) => l.id === t.leadId);
              return (
                <div className={`task-row ${t.done ? 'task-done' : ''}`} key={t.id}>
                  <button
                    aria-label={`${t.done ? '恢复' : '完成'}任务 ${t.title} ${l?.name}`}
                    disabled={
                      busy || (t.kind === 'sales' && !!l && ['已报名', '流失'].includes(l.stage))
                    }
                    className={`check-box ${t.done ? 'checked' : ''}`}
                    onClick={() =>
                      mutate({
                        type: 'task',
                        id: t.id,
                        status: t.done ? '待跟进' : '已联系',
                        done: !t.done,
                      })
                    }
                  >
                    <Check size={14} />
                  </button>
                  <div className="task-main">
                    <div>
                      <h3>{t.title}</h3>
                      <Badge color={t.kind === 'operation' ? 'teal' : 'indigo'}>
                        {t.kind === 'operation' ? '学员运营' : '招生跟进'}
                      </Badge>
                    </div>
                    <p>{t.detail}</p>
                  </div>
                  <button className="task-person" onClick={() => go('leads', t.leadId)}>
                    <Avatar
                      name={l?.name || '学员'}
                      index={data.leads.findIndex((l) => l.id === t.leadId)}
                      small
                    />
                    <span>
                      {l?.name}
                      <small>{l?.owner}</small>
                    </span>
                  </button>
                  <div className="task-date">
                    <CalendarDays size={13} />
                    <span className={!t.done && dateKey(t.due) < today ? 'text-rose' : ''}>
                      {dayLabel(t.due)}
                      {!t.done && dateKey(t.due) < today ? ' · 逾期' : ''}
                    </span>
                  </div>
                  <select
                    aria-label={`${l?.name}的任务状态 ${t.title}`}
                    value={t.status}
                    disabled={t.done}
                    onChange={(e) =>
                      mutate({
                        type: 'task',
                        id: t.id,
                        status: e.target.value as Task['status'],
                        done: false,
                      })
                    }
                  >
                    {[
                      '待跟进',
                      '已联系',
                      '待回复',
                      '流失',
                      ...(t.status === '已报名' ? ['已报名'] : []),
                    ].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                  <button
                    className="icon-button"
                    aria-label={`编辑任务 ${t.title} ${l?.name}`}
                    onClick={() => edit(t)}
                  >
                    <PenLine size={15} />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <Empty
            title={filter === '今日待办' ? '今日的跟进已全部完成' : '当前没有符合条件的任务'}
            description="需要时，可以从学员详情补充跟进计划。"
          />
        )}
        <div className="panel-footer">
          共 {filtered.length} 项任务
          <span className="muted">报名会自动结束销售待办并创建入学引导</span>
        </div>
      </div>
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="调整跟进任务"
        description="根据学员意愿，修改内容与跟进日期。"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (
              editing &&
              (await mutate({
                type: 'editTask',
                id: editing.id,
                title,
                detail,
                due: new Date(due + 'T10:00:00+08:00').toISOString(),
              }))
            ) {
              setEditing(null);
              toast('跟进任务已更新');
            }
          }}
        >
          <label className="form-field">
            任务标题
            <input
              required
              value={title}
              maxLength={200}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className="form-field">
            跟进日期
            <input type="date" required value={due} onChange={(e) => setDue(e.target.value)} />
          </label>
          <label className="form-field">
            行动说明
            <textarea rows={4} value={detail} onChange={(e) => setDetail(e.target.value)} />
          </label>
          <div className="modal-footer">
            <Button type="submit">保存任务</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
