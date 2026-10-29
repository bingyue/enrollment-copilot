'use client';
import { createContext, useContext, type ReactNode } from 'react';
import { Sparkles, ArrowUpRight, Inbox, Loader2, ChevronRight } from 'lucide-react';
import type { Action, Workspace, Lead } from '@/lib/schema';
import { cn } from '@/lib/utils';
export type Nav = 'overview' | 'leads' | 'tasks' | 'students' | 'courses' | 'quality' | 'settings';
export interface AppContextType {
  data: Workspace;
  nav: Nav;
  go: (nav: Nav, id?: string) => void;
  selectedId: string;
  setSelectedId: (id: string) => void;
  mutate: (a: Action) => Promise<Workspace | null>;
  replace: (w: Workspace) => void;
  toast: (text: string) => void;
  openImport: () => void;
  search: string;
  setSearch: (s: string) => void;
  busy: boolean;
  mode: string;
}
export const AppContext = createContext<AppContextType>(null!);
export const useApp = () => useContext(AppContext);
export function Badge({ children, color = 'slate' }: { children: ReactNode; color?: string }) {
  return <span className={cn('badge', `badge-${color}`)}>{children}</span>;
}
export function Avatar({
  name,
  index = 0,
  small = false,
}: {
  name: string;
  index?: number;
  small?: boolean;
}) {
  return (
    <span className={cn('avatar', `avatar-${index % 5}`, small && 'avatar-small')}>
      {name.slice(-2)}
    </span>
  );
}
export function Grade({ lead }: { lead: Lead }) {
  const g = lead.analysis.grade;
  return (
    <Badge color={g === 'A' ? 'amber' : g === 'B' ? 'indigo' : g === 'C' ? 'slate' : 'rose'}>
      {g} · {g === 'A' ? '高意向' : g === 'B' ? '培育中' : g === 'C' ? '待培育' : '无效线索'}
    </Badge>
  );
}
export function Stage({ value }: { value: string }) {
  return (
    <Badge
      color={
        value === '已报名'
          ? 'teal'
          : value === '流失'
            ? 'rose'
            : value === '异议处理'
              ? 'amber'
              : 'slate'
      }
    >
      {value}
    </Badge>
  );
}
export function SectionTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-title">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
export function Empty({
  title = '暂时没有内容',
  description = '试试调整筛选条件，或添加一条新的咨询。',
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span>
        <Inbox size={28} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function AiLabel({ mode = 'demo' }: { mode?: string }) {
  return (
    <span className="ai-label">
      <Sparkles size={12} />
      {mode === 'live' ? 'AI 模型分析' : '演示分析'}
    </span>
  );
}
export function TextLink({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button className="text-link" onClick={onClick}>
      {children}
      <ChevronRight size={14} />
    </button>
  );
}
export function Loading({ text = '正在加载工作区' }: { text?: string }) {
  return (
    <div className="loading-screen">
      <span className="brand-mark">
        <Sparkles size={26} />
      </span>
      <Loader2 className="spin" size={22} />
      <p>{text}</p>
    </div>
  );
}
export function Progress({ value, color = 'indigo' }: { value: number; color?: string }) {
  return (
    <div className={`progress progress-${color}`}>
      <span style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
export function Metric({
  label,
  value,
  suffix,
  description,
  icon,
  color = 'indigo',
}: {
  label: string;
  value: string | number;
  suffix?: string;
  description: string;
  icon: ReactNode;
  color?: string;
}) {
  return (
    <div className="metric-card">
      <div className="metric-top">
        <span>{label}</span>
        <i className={`metric-icon tone-${color}`}>{icon}</i>
      </div>
      <div className="metric-value">
        {value}
        <span>{suffix}</span>
      </div>
      <div className="metric-foot">
        <span>{description}</span>
        <ArrowUpRight size={15} />
      </div>
    </div>
  );
}
export async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || '操作失败，请重试');
  return data;
}
