'use client';
import { useEffect, useState } from 'react';
import {
  Database,
  Download,
  RefreshCw,
  ShieldCheck,
  PlugZap,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  Server,
} from 'lucide-react';
import { useApp, PageHeading, Badge, SectionTitle, request } from './shared';
import { Button } from './ui/button';
import { Modal } from './ui/dialog';
import { downloadFile } from './tasks';
export function Settings() {
  const { data, mutate, toast } = useApp();
  const [status, setStatus] = useState<{
    mode: string;
    configured: boolean;
    model: string;
    storage: string;
    passwordRequired: boolean;
  } | null>(null);
  const [reset, setReset] = useState(false);
  useEffect(() => {
    request<typeof status>('/api/status')
      .then(setStatus)
      .catch((e) => toast(e.message));
  }, [toast]);
  return (
    <div className="page settings-page">
      <PageHeading
        eyebrow="A WORKSPACE YOU CAN TRUST"
        title="让工作台，按你的方式运行"
        description="演示数据开箱即用，真实模型与数据库按需连接。"
      />
      <div className="settings-grid">
        <div className="panel">
          <SectionTitle
            title="AI 分析服务"
            subtitle="独立 Provider · 支持 OpenAI Compatible API"
            action={
              <span className="setting-icon">
                <PlugZap size={21} />
              </span>
            }
          />
          <div className="setting-row">
            <span>当前分析模式</span>
            <Badge color={status?.mode === 'live' ? 'teal' : 'indigo'}>
              {status?.mode === 'live' ? '真实模型模式' : '演示模式'}
            </Badge>
          </div>
          <div className="setting-row">
            <span>模型</span>
            <strong>{status?.model || '加载中'}</strong>
          </div>
          <div className="setting-row">
            <span>服务凭证</span>
            <span>{status?.configured ? '已配置，仅服务端可见' : '未配置，当前演示无需密钥'}</span>
          </div>
          <p className="setting-description">
            演示模式通过明确规则分析目标、基础、预算与时间，适合完整流程演示。真实模式使用你配置的模型服务，并验证结构化输出。
          </p>
          <details className="config-details">
            <summary>如何连接 OpenAI / DeepSeek / Qwen</summary>
            <p>
              在项目的 .env.local 中设置以下变量，然后重启服务。请勿把 API Key
              放在浏览器或公开代码中。
            </p>
            <pre>
              {
                'AI_MODE=live\nLLM_BASE_URL=https://api.deepseek.com/v1\nLLM_MODEL=deepseek-chat\nLLM_API_KEY=你的服务端密钥\nLLM_RESPONSE_FORMAT=json_object'
              }
            </pre>
            <p>
              OpenAI 可使用 json_schema；其他兼容服务根据支持情况使用 json_object。所有输出仍经过
              Zod 校验。
            </p>
          </details>
        </div>
        <div className="panel">
          <SectionTitle
            title="工作区数据"
            subtitle="每一次跟进与校正，都会保存"
            action={
              <span className="setting-icon">
                <Database size={21} />
              </span>
            }
          />
          <div className="setting-row">
            <span>存储方式</span>
            <Badge color="teal">{status?.storage || '加载中'}</Badge>
          </div>
          <div className="setting-row">
            <span>当前数据</span>
            <strong>
              {data.leads.length} 条线索 · {data.students.length} 位学员
            </strong>
          </div>
          <div className="setting-row">
            <span>数据版本</span>
            <span>v{data.version}</span>
          </div>
          <p className="setting-description">
            本地数据保存在项目 .data 目录。配置 Supabase 后可切换到云端保存，现有数据不会自动迁移。
          </p>
          <Button
            variant="outline"
            onClick={() => {
              downloadFile(
                `知遇工作区备份-${new Date().toISOString().slice(0, 10)}.json`,
                JSON.stringify(data, null, 2),
              );
              toast('完整工作区数据已导出');
            }}
          >
            <Download size={15} />
            导出完整工作区
          </Button>
          <details className="config-details">
            <summary>连接 Supabase</summary>
            <p>
              先执行项目 supabase/schema.sql，再配置 SUPABASE_URL、SUPABASE_SERVICE_ROLE_KEY 和
              WORKSPACE_ID。数据库默认禁止浏览器匿名访问，服务端保存时检查数据版本。
            </p>
          </details>
        </div>
        <div className="panel">
          <SectionTitle
            title="使用边界与人工确认"
            action={
              <span className="setting-icon">
                <ShieldCheck size={21} />
              </span>
            }
          />
          <div className="setting-rules">
            {[
              '所有分析结果可人工校正，建议使用前由课程顾问确认。',
              '意向评分是辅助判断，不等于统计意义上的成交概率。',
              '只使用课程库中的事实，不承诺就业、收入或学习效果。',
              '跟进任务和建议回复不会自动发送给学员。',
              '当前版本为单机构工作区；上线共享前需配置访问密码。',
            ].map((x) => (
              <p key={x}>
                <CheckCircle2 size={16} />
                {x}
              </p>
            ))}
          </div>
          <div className="setting-row">
            <span>访问密码</span>
            <Badge color={status?.passwordRequired ? 'teal' : 'slate'}>
              {status?.passwordRequired ? '已启用' : '本地演示访问'}
            </Badge>
          </div>
        </div>
        <div className="panel">
          <SectionTitle title="重新开始演示" subtitle="恢复预置课程、50 条线索与演示质检报告" />
          <p className="setting-description">
            此操作会覆盖当前工作区的修改、新增咨询与报名记录。建议先导出备份。
          </p>
          <div className="reset-demo-card">
            <BookOpen size={24} />
            <div>
              <strong>一套完整的职业教育故事</strong>
              <p>AI / FDE、AI 产品经理、电商、Python、新媒体</p>
            </div>
          </div>
          <Button variant="danger" onClick={() => setReset(true)}>
            <RefreshCw size={15} />
            恢复演示数据
          </Button>
        </div>
      </div>
      <Modal
        open={reset}
        onClose={() => setReset(false)}
        title="恢复演示数据？"
        description="当前工作区的数据将被 50 条预置线索替换。你可以先导出完整工作区备份。"
      >
        <div className="modal-footer">
          <Button variant="outline" onClick={() => setReset(false)}>
            保留当前数据
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              if (await mutate({ type: 'reset', confirm: 'RESET_DEMO' })) {
                setReset(false);
                toast('已恢复 50 条演示线索与完整演示场景');
              }
            }}
          >
            确认恢复演示数据
          </Button>
        </div>
      </Modal>
    </div>
  );
}
