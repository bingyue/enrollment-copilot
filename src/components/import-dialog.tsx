'use client';
import { useState } from 'react';
import { FileText, ArrowRight, Sparkles, Loader2, CheckCircle2 } from 'lucide-react';
import { Modal } from './ui/dialog';
import { Button } from './ui/button';
import { useApp, request } from './shared';
import { sources, type Workspace } from '@/lib/schema';
import { demoConsultation } from '@/lib/seed';
export function ImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { replace, go, toast, mode } = useApp();
  const [name, setName] = useState('');
  const [source, setSource] = useState<string>('微信');
  const [owner, setOwner] = useState('林老师');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const sample = () => {
    setName('林悦');
    setText(demoConsultation);
    setError('');
  };
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await request<{ workspace: Workspace; leadId: string }>('/api/analyze', {
        method: 'POST',
        body: JSON.stringify({ name, source, owner, transcript: text }),
      });
      replace(r.workspace);
      go('leads', r.leadId);
      toast(
        r.workspace.leads.find((l) => l.id === r.leadId)?.stage === '流失'
          ? '已保存档案，尊重联系意愿，未生成营销跟进任务'
          : '分析完成，客户档案与 7 天跟进计划已保存',
      );
      setText('');
      setName('');
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      open={open}
      onClose={() => {
        if (!busy) onClose();
      }}
      title="让一段咨询，变成清晰的下一步"
      description="粘贴微信、企微或网页咨询记录，自动创建客户档案与跟进计划。"
      wide
    >
      <form onSubmit={submit}>
        <div className="import-layout">
          <div>
            <div className="form-grid three">
              <label>
                学员姓名
                <input
                  autoFocus
                  required
                  maxLength={40}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例如：林悦"
                />
              </label>
              <label>
                咨询来源
                <select value={source} onChange={(e) => setSource(e.target.value)}>
                  {sources.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label>
                负责顾问
                <input
                  required
                  value={owner}
                  maxLength={40}
                  onChange={(e) => setOwner(e.target.value)}
                />
              </label>
            </div>
            <div className="field-heading">
              <label htmlFor="consultation">咨询记录</label>
              <button type="button" className="text-link" onClick={sample}>
                <FileText size={14} />
                填入演示案例
              </button>
            </div>
            <textarea
              id="consultation"
              className="consultation-input"
              required
              minLength={12}
              maxLength={16000}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                '学员：你好，我想了解 AI 产品经理课程…\n老师：你目前从事什么工作？希望解决什么问题？\n\n建议保留「学员：」「老师：」角色，分析会更准确。'
              }
            />
            <div className="textarea-footer">
              <span>支持直接粘贴 · 最多 16,000 字</span>
              <span>{text.length.toLocaleString()} / 16,000</span>
            </div>
          </div>
          <aside className="import-preview">
            <span className="insight-icon">
              <Sparkles size={20} />
            </span>
            <h3>一次分析，七份答案</h3>
            {[
              '结构化学员画像',
              '适合与不适合的课程',
              '有依据的意向评分',
              '核心异议与应对策略',
              '可编辑的建议回复',
              '当下最合适的行动',
              '自动保存 7 天跟进计划',
            ].map((x) => (
              <p key={x}>
                <CheckCircle2 size={15} />
                {x}
              </p>
            ))}
            <small>
              {mode === 'live' ? '使用已配置的 AI 模型分析' : '当前为演示模式，无需模型密钥'}
            </small>
          </aside>
        </div>
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}
        <div className="modal-footer">
          <span className="muted tiny">分析结果可人工校正 · 不自动发送给客户</span>
          <Button type="submit" disabled={busy || text.trim().length < 12 || !name.trim()}>
            {busy ? (
              <>
                <Loader2 className="spin" size={16} />
                正在识别需求与匹配课程…
              </>
            ) : (
              <>
                <Sparkles size={16} />
                分析并建立档案
                <ArrowRight size={16} />
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
