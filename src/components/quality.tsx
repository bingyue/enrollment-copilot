'use client';
import { useRef, useState } from 'react';
import {
  ShieldCheck,
  MessageSquareWarning,
  Flame,
  TrendingUp,
  Sparkles,
  Upload,
  Download,
  FileText,
  ArrowRight,
  Loader2,
  Quote,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useApp, PageHeading, Metric, Badge, SectionTitle, Avatar, Empty, request } from './shared';
import { Button } from './ui/button';
import { Modal } from './ui/dialog';
import { qaSample } from '@/lib/seed';
import { qualityInput, type QualityItem, type QualityInput, type Workspace } from '@/lib/schema';
import { dayLabel, timeLabel } from '@/lib/utils';
import { downloadFile } from './tasks';
function parseImport(text: string): QualityInput {
  if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
    const d = JSON.parse(text);
    return qualityInput.parse(Array.isArray(d) ? { conversations: d } : d);
  }
  const conversations = text
    .trim()
    .split(/\n\s*---+\s*\n/)
    .filter(Boolean)
    .map((block, i) => {
      const lines = block.split('\n');
      const header = lines[0];
      const advisor = header.match(/顾问[=＝]\s*([^;；\n]+)/)?.[1]?.trim() || '待分配顾问';
      const leadName = header.match(/学员[=＝]\s*([^;；\n]+)/)?.[1]?.trim() || `咨询 ${i + 1}`;
      const result = header.match(/结果[=＝]\s*(已报名|未报名|未知)/)?.[1] as
        '已报名' | '未报名' | '未知' | undefined;
      return {
        advisor,
        leadName,
        outcome: result || ('未知' as const),
        transcript: /顾问[=＝]/.test(header) ? lines.slice(1).join('\n') : block,
      };
    });
  return qualityInput.parse({ conversations });
}
export function Quality() {
  const { data, replace, toast } = useApp();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('全部对话');
  const [reportId, setReportId] = useState(data.reports[0]?.id);
  const [selected, setSelected] = useState<QualityItem | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const report = data.reports.find((r) => r.id === reportId) || data.reports[0];
  const items = report?.items || [];
  const average = items.length
    ? Math.round(items.reduce((s, x) => s + x.score, 0) / items.length)
    : 0;
  const price = items.filter((x) => x.issues.some((i) => i.type === '价格异议未解决')).length;
  const wasted = items.filter((x) => x.wasted).length;
  const advisors = Array.from(new Set(items.map((x) => x.advisor)))
    .map((name) => {
      const sample = items.filter((x) => x.advisor === name);
      const known = sample.filter((x) => x.outcome !== '未知');
      return {
        name,
        total: sample.length,
        score: Math.round(sample.reduce((s, x) => s + x.score, 0) / sample.length),
        price: sample.filter((x) => x.issues.some((i) => i.type === '价格异议未解决')).length,
        known: known.length,
        enrolled: sample.filter((x) => x.outcome === '已报名').length,
      };
    })
    .sort((a, b) => b.score - a.score);
  const strategies = [
    { name: '先确认学习目标与基础', pattern: /目标|基础|每周/ },
    { name: '回应情绪与费用顾虑', pattern: /理解|担心|您提到|预算/ },
    { name: '提供大纲、试听或测评', pattern: /大纲|试听|测评|练习/ },
    { name: '约定具体下一步', pattern: /明天|下周|周[一二三四五六日]|约|再联系/ },
  ]
    .map((strategy) => {
      const sample = items.filter((item) =>
        strategy.pattern.test(
          item.transcript
            .split('\n')
            .filter((line) => /^(老师|顾问|销售|招生老师)[：:]/.test(line.trim()))
            .join('\n'),
        ),
      );
      const known = sample.filter((item) => item.outcome !== '未知');
      const enrolled = known.filter((item) => item.outcome === '已报名').length;
      return {
        ...strategy,
        total: sample.length,
        known: known.length,
        enrolled,
        rate: known.length ? Math.round((enrolled / known.length) * 100) : null,
      };
    })
    .sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1) || b.known - a.known);
  const filtered = items.filter(
    (x) =>
      filter === '全部对话' ||
      (filter === '可挽回线索' && x.wasted) ||
      (filter === '高风险对话' && x.risk === '高') ||
      (filter === '优秀片段' && x.score >= 80),
  );
  async function run(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    let input;
    try {
      input = parseImport(text);
    } catch {
      setError('请检查导入格式：每条记录至少 12 字，一次最多 20 条；JSON 字段请参考演示样例。');
      return;
    }
    setBusy(true);
    try {
      const r = await request<{ workspace: Workspace; reportId: string }>('/api/quality', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      replace(r.workspace);
      setReportId(r.reportId);
      setOpen(false);
      toast('对话质检完成，报告已保存');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page">
      <PageHeading
        eyebrow="TURN CONVERSATIONS INTO TEAM GROWTH"
        title="好的招生，不该只靠个人经验"
        description="看见被遗漏的需求，复盘价格异议，让好话术成为团队的方法。"
        action={
          <div className="heading-actions">
            <Button
              variant="outline"
              disabled={!report}
              onClick={() =>
                downloadFile('知遇-对话质检报告.json', JSON.stringify(report, null, 2))
              }
            >
              <Download size={15} />
              导出报告
            </Button>
            <Button onClick={() => setOpen(true)}>
              <Upload size={15} />
              批量导入对话
            </Button>
          </div>
        }
      />
      <div className="metrics-grid">
        <Metric
          label="已质检对话"
          value={items.length}
          description="当前报告内的独立咨询记录"
          icon={<ShieldCheck size={19} />}
        />
        <Metric
          label="团队平均质检分"
          value={average}
          suffix="分"
          description="基于需求、回应与跟进完整度"
          icon={<TrendingUp size={19} />}
          color="teal"
        />
        <Metric
          label="可挽回的咨询"
          value={wasted}
          description="有需求但沟通环节存在遗漏"
          icon={<Flame size={19} />}
          color="amber"
        />
        <Metric
          label="价格异议未解决"
          value={price}
          description="建议优先进行针对性辅导"
          icon={<MessageSquareWarning size={19} />}
          color="rose"
        />
      </div>
      <div className="insight-banner">
        <div className="insight-icon">
          <Sparkles size={21} />
        </div>
        <div className="insight-copy">
          <div>
            <strong>把复盘，变成下一次成交的准备</strong>
            <Badge color="indigo">{report?.engine === 'live' ? 'AI 质检' : '演示质检'}</Badge>
          </div>
          <p>{report?.summary || '导入招生老师的聊天记录，查看有证据的质检建议。'}</p>
        </div>
      </div>
      <div className="quality-grid">
        <div className="panel">
          <SectionTitle title="顾问沟通表现" subtitle="用具体问题做辅导，不用单一分数评价老师" />
          <div className="table-scroll">
            <table className="crm-table advisor-table">
              <thead>
                <tr>
                  <th>课程顾问</th>
                  <th>样本</th>
                  <th>质检分</th>
                  <th>价格异议遗漏</th>
                  <th>已知结果报名率</th>
                </tr>
              </thead>
              <tbody>
                {advisors.map((a, i) => (
                  <tr key={a.name}>
                    <td>
                      <div className="person-cell">
                        <Avatar name={a.name} index={i} small />
                        <strong>{a.name}</strong>
                      </div>
                    </td>
                    <td>{a.total} 段</td>
                    <td>
                      <b className={a.score < 60 ? 'text-rose' : 'text-indigo'}>{a.score}</b>
                    </td>
                    <td>{a.price ? <Badge color="amber">{a.price} 次</Badge> : '—'}</td>
                    <td>
                      {a.known ? `${Math.round((a.enrolled / a.known) * 100)}%` : '未知'}
                      <small className="block muted">
                        {a.enrolled} / {a.known} 个已知结果
                      </small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="panel-footer">
            未知结果不计入报名率；小样本仅供复盘，不证明话术带来转化。
          </div>
        </div>
        <div className="panel good-practice">
          <SectionTitle title="值得学习的做法" subtitle="来自本次高质量沟通片段" />
          <div className="quote-icon">
            <Quote size={21} />
          </div>
          {items.filter((x) => x.score >= 80).length ? (
            <>
              <blockquote>
                {items
                  .filter((x) => x.score >= 80)[0]
                  .transcript.split('\n')
                  .filter((x) => /^(老师|顾问)[：:]/.test(x))
                  .at(-1)}
              </blockquote>
              <div className="practice-tags">
                {items
                  .filter((x) => x.score >= 80)[0]
                  .strengths.map((s) => (
                    <span key={s}>
                      <CheckCircle2 size={13} />
                      {s}
                    </span>
                  ))}
              </div>
              <span className="muted tiny">
                出自 {items.filter((x) => x.score >= 80)[0].advisor} ·{' '}
                {items.filter((x) => x.score >= 80)[0].leadName} 的咨询
              </span>
            </>
          ) : (
            <p className="muted">当前没有达到优秀标准的片段，可先改善具体问题再进行复盘。</p>
          )}
        </div>
      </div>
      <div className="panel strategy-panel">
        <SectionTitle
          title="哪些话术策略，出现在更好的报名结果中？"
          subtitle="按当前导入记录分组，策略可重叠；只计算已知结果，不能推断因果。"
        />
        <div className="table-scroll">
          <table className="crm-table">
            <thead>
              <tr>
                <th>沟通策略</th>
                <th>出现对话</th>
                <th>已知结果</th>
                <th>已报名</th>
                <th>样本报名率</th>
              </tr>
            </thead>
            <tbody>
              {strategies.map((strategy) => (
                <tr key={strategy.name}>
                  <td>
                    <strong>{strategy.name}</strong>
                  </td>
                  <td>{strategy.total} 段</td>
                  <td>{strategy.known} 段</td>
                  <td>{strategy.enrolled} 人</td>
                  <td>
                    <Badge color={strategy.rate !== null && strategy.rate >= 50 ? 'teal' : 'slate'}>
                      {strategy.rate === null ? '暂无已知结果' : strategy.rate + '%'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="panel-footer">
          优先复盘有具体证据的完整对话；小样本结果不能用作效果承诺或人员考核结论。
        </div>
      </div>
      <div className="panel quality-list">
        <div className="table-toolbar">
          <div className="tabs">
            {['全部对话', '可挽回线索', '高风险对话', '优秀片段'].map((f) => (
              <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>
                {f}
              </button>
            ))}
          </div>
          <select
            aria-label="质检历史报告"
            value={report?.id || ''}
            onChange={(e) => setReportId(e.target.value)}
          >
            {data.reports.map((r, i) => (
              <option key={r.id} value={r.id}>
                {i === 0 ? '最新报告 · ' : ''}
                {dayLabel(r.createdAt)} {timeLabel(r.createdAt)} · {r.items.length} 段
              </option>
            ))}
          </select>
        </div>
        {filtered.map((item) => (
          <div className="quality-row" key={item.id}>
            <span
              className={`quality-score ${item.score < 60 ? 'quality-low' : item.score >= 80 ? 'quality-high' : ''}`}
            >
              {item.score}
              <small>质检分</small>
            </span>
            <div className="quality-row-main">
              <div>
                <h3>
                  {item.advisor} <span>与</span> {item.leadName}
                </h3>
                <Badge color={item.risk === '高' ? 'rose' : item.risk === '中' ? 'amber' : 'teal'}>
                  {item.risk}风险
                </Badge>
                {item.wasted && <Badge color="amber">可挽回</Badge>}
              </div>
              <p>
                {item.issues.length
                  ? item.issues.map((i) => i.type).join(' · ')
                  : item.strengths.join(' · ') || '暂未发现明显沟通问题'}
              </p>
              <small>记录的结果：{item.outcome}</small>
            </div>
            <Button size="sm" variant="outline" onClick={() => setSelected(item)}>
              查看证据与建议
              <ArrowRight size={14} />
            </Button>
          </div>
        ))}
        {!filtered.length && (
          <Empty title="没有符合条件的对话" description="可以切换分组，或导入新的聊天记录。" />
        )}
      </div>
      <Modal
        open={open}
        onClose={() => {
          if (!busy) setOpen(false);
        }}
        title="批量导入招生对话"
        description="一次最多 20 段。支持 JSON 或用 --- 分隔的文本，可直接上传 .txt / .json。"
        wide
      >
        <form onSubmit={run}>
          <div className="quality-import-toolbar">
            <Button type="button" variant="outline" size="sm" onClick={() => file.current?.click()}>
              <Upload size={14} />
              选择文件
            </Button>
            <button
              type="button"
              className="text-link"
              onClick={() => {
                setText(JSON.stringify(qaSample, null, 2));
                setError('');
              }}
            >
              填入 4 段演示对话
            </button>
            <input
              type="file"
              ref={file}
              hidden
              accept=".json,.txt"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) {
                  if (f.size > 300000) {
                    setError('文件请控制在 300 KB 以内');
                    return;
                  }
                  setText(await f.text());
                  setError('');
                }
                e.target.value = '';
              }}
            />
          </div>
          <textarea
            aria-label="批量聊天记录"
            rows={15}
            value={text}
            onChange={(e) => setText(e.target.value)}
            required
            placeholder={
              '顾问=林老师;学员=小周;结果=未知\n学员：我想学AI，预算5000元，有点担心课程效果。\n老师：先了解一下您的基础和学习目标…\n---\n顾问=陈老师;学员=小李;结果=已报名\n学员：…\n老师：…'
            }
          />
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
          <div className="modal-footer">
            <span className="muted tiny">标注角色和结果，会让证据与统计更准确</span>
            <Button disabled={busy || text.trim().length < 12} type="submit">
              {busy ? <Loader2 className="spin" size={15} /> : <Sparkles size={15} />}{' '}
              {busy ? '正在逐段质检…' : '开始质检'}
            </Button>
          </div>
        </form>
      </Modal>
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={`${selected?.advisor} · ${selected?.leadName} 的沟通复盘`}
        description="每个判断都应有原始证据，建议话术请按实际课程信息调整。"
        wide
      >
        {selected && (
          <div className="quality-detail-grid">
            <div>
              <h3>原始对话</h3>
              <pre>{selected.transcript}</pre>
              <Badge color={selected.outcome === '已报名' ? 'teal' : 'slate'}>
                结果：{selected.outcome}
              </Badge>
            </div>
            <div>
              <h3>问题与改进建议</h3>
              {selected.issues.map((issue, i) => (
                <div className="quality-issue" key={i}>
                  <strong>
                    <AlertTriangle size={14} />
                    {issue.type}
                  </strong>
                  <blockquote>“{issue.evidence}”</blockquote>
                  <p>{issue.suggestion}</p>
                </div>
              ))}
              {!selected.issues.length && (
                <div className="notice notice-teal">
                  <CheckCircle2 size={17} />
                  <p>当前片段未发现明显沟通问题，可以学习其中的需求确认与下一步约定。</p>
                </div>
              )}
              <div className="reply-card">
                <h4>可以尝试这样说</h4>
                <p>{selected.bestReply}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
