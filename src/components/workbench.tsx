'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  LayoutDashboard,
  ContactRound,
  ListTodo,
  GraduationCap,
  BookOpen,
  ShieldCheck,
  Settings as SettingsIcon,
  Search,
  Plus,
  ChevronDown,
  ChevronsUpDown,
  Bell,
  HelpCircle,
  ArrowUpRight,
  Sparkles,
  Menu,
  X,
  LockKeyhole,
  CheckCircle2,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { AppContext, Loading, request, type Nav, Avatar, Badge } from './shared';
import { Dashboard } from './dashboard';
import { Leads } from './leads';
import { Tasks } from './tasks';
import { Students } from './students';
import { Courses } from './courses';
import { Quality } from './quality';
import { Settings } from './settings';
import { ImportDialog } from './import-dialog';
import { Button } from './ui/button';
import { Modal } from './ui/dialog';
import type { Action, Workspace } from '@/lib/schema';
import { metrics } from '@/lib/domain';
import { dateKey } from '@/lib/utils';
const navigation: { id: Nav; name: string; icon: typeof LayoutDashboard; caption?: string }[] = [
  { id: 'overview', name: '今日概览', icon: LayoutDashboard },
  { id: 'leads', name: '招生工作台', icon: ContactRound },
  { id: 'tasks', name: '跟进任务', icon: ListTodo },
  { id: 'students', name: '学员运营', icon: GraduationCap },
  { id: 'courses', name: '课程资料库', icon: BookOpen },
  { id: 'quality', name: '销售对话质检', icon: ShieldCheck },
  { id: 'settings', name: '工作区设置', icon: SettingsIcon },
];
export default function Workbench() {
  const [data, setData] = useState<Workspace | null>(null);
  const [nav, setNav] = useState<Nav>('overview');
  const [selectedId, setSelectedId] = useState('lead-1');
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [guide, setGuide] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState('demo');
  const [error, setError] = useState('');
  const [locked, setLocked] = useState(false);
  const [password, setPassword] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toast = useCallback((text: string) => {
    setMessage(text);
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = setTimeout(() => setMessage(''), 4500);
  }, []);
  const load = useCallback(async () => {
    setError('');
    try {
      const status = await request<{ mode: string; authorized: boolean }>('/api/status');
      setMode(status.mode);
      if (!status.authorized) {
        setLocked(true);
        return;
      }
      setLocked(false);
      setData(await request<Workspace>('/api/workspace'));
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    load();
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view') as Nav;
    if (navigation.some((x) => x.id === view)) setNav(view);
    if (params.get('lead')) setSelectedId(params.get('lead')!);
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [load]);
  const replace = useCallback(
    (w: Workspace) => setData((prev) => (!prev || w.version >= prev.version ? w : prev)),
    [],
  );
  const go = useCallback((view: Nav, id?: string) => {
    setNav(view);
    if (id) {
      setSelectedId(id);
      setSearch('');
    }
    setMobile(false);
    const p = new URLSearchParams({ view });
    if (id) p.set('lead', id);
    window.history.replaceState({}, '', `?${p}`);
  }, []);
  const mutate = useCallback(
    async (action: Action) => {
      setBusy(true);
      try {
        const w = await request<Workspace>('/api/workspace', {
          method: 'POST',
          body: JSON.stringify(action),
        });
        replace(w);
        return w;
      } catch (e) {
        toast((e as Error).message);
        return null;
      } finally {
        setBusy(false);
      }
    },
    [toast, replace],
  );
  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoggingIn(true);
    setError('');
    try {
      await request('/api/login', { method: 'POST', body: JSON.stringify({ password }) });
      setPassword('');
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoggingIn(false);
    }
  }
  if (locked)
    return (
      <div className="login-screen">
        <form onSubmit={login}>
          <span className="brand-mark">
            <BookOpen size={28} />
          </span>
          <h1>欢迎回到知遇</h1>
          <p>登录你的招生与学员运营工作区</p>
          <label className="form-field">
            工作区访问密码
            <input
              autoFocus
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <Button className="full-width" type="submit" disabled={loggingIn}>
            {loggingIn ? <Loader2 className="spin" size={16} /> : <LockKeyhole size={16} />}
            进入工作区
          </Button>
        </form>
      </div>
    );
  if (error && !data)
    return (
      <div className="loading-screen">
        <h2>暂时无法打开工作区</h2>
        <p>{error}</p>
        <Button onClick={load}>重新加载</Button>
      </div>
    );
  if (!data) return <Loading />;
  const m = metrics(data);
  const current = navigation.find((x) => x.id === nav)!;
  return (
    <AppContext.Provider
      value={{
        data,
        nav,
        go,
        selectedId,
        setSelectedId,
        mutate,
        replace,
        toast,
        openImport: () => setImportOpen(true),
        search,
        setSearch,
        busy,
        mode,
      }}
    >
      <div className="app-shell">
        {mobile && (
          <button
            className="mobile-overlay"
            aria-label="关闭导航"
            onClick={() => setMobile(false)}
          />
        )}
        <aside className={`sidebar ${mobile ? 'mobile-open' : ''}`}>
          <button className="brand" onClick={() => go('overview')}>
            <span className="brand-mark">
              <BookOpen size={24} />
              <i />
            </span>
            <span>
              <strong>
                知遇<span> ZHIYU</span>
              </strong>
              <small>招生与学员成长工作台</small>
            </span>
          </button>
          <button className="workspace-switch" onClick={() => go('settings')}>
            <span className="workspace-emblem">知</span>
            <div>
              <strong>知遇职业成长学院</strong>
              <small>
                <i />
                演示工作区
              </small>
            </div>
            <ChevronsUpDown size={14} />
          </button>
          <span className="nav-label">日常工作</span>
          <nav>
            {navigation.slice(0, 4).map(({ id, name, icon: Icon }) => (
              <button key={id} className={nav === id ? 'active' : ''} onClick={() => go(id)}>
                <Icon size={18} />
                <span>{name}</span>
                {id === 'tasks' && m.due > 0 && <b>{m.due}</b>}
                {id === 'leads' && <small>{data.leads.length}</small>}
              </button>
            ))}
          </nav>
          <span className="nav-label second-label">知识与洞察</span>
          <nav>
            {navigation.slice(4, 6).map(({ id, name, icon: Icon }) => (
              <button key={id} className={nav === id ? 'active' : ''} onClick={() => go(id)}>
                <Icon size={18} />
                <span>{name}</span>
                {id === 'quality' && <em>NEW</em>}
              </button>
            ))}
          </nav>
          <div className="sidebar-spacer" />
          <div className="sidebar-tip">
            <span>
              <Sparkles size={15} />
              更好地理解每一位学员
            </span>
            <p>
              让 AI 整理信息，
              <br />
              把你的时间留给沟通。
            </p>
            <button onClick={() => setGuide(true)}>
              3 分钟体验完整流程
              <ArrowUpRight size={13} />
            </button>
            <div className="tip-lines" aria-hidden="true">
              <i />
              <i />
              <i />
            </div>
          </div>
          <nav className="bottom-nav">
            <button className={nav === 'settings' ? 'active' : ''} onClick={() => go('settings')}>
              <SettingsIcon size={18} />
              <span>工作区设置</span>
            </button>
            <button onClick={() => setGuide(true)}>
              <HelpCircle size={18} />
              <span>演示使用指南</span>
            </button>
          </nav>
          <button className="sidebar-profile" onClick={() => go('settings')}>
            <Avatar name="林老师" small />
            <div>
              <strong>林老师</strong>
              <small>招生顾问</small>
            </div>
            <ChevronsUpDown size={14} />
          </button>
        </aside>
        <div className="main-shell">
          <header className="topbar">
            <div className="breadcrumb">
              <button
                className="mobile-menu icon-button"
                aria-label="展开导航"
                onClick={() => setMobile(true)}
              >
                <Menu size={21} />
              </button>
              <span>工作空间</span>
              <ChevronDown size={12} className="breadcrumb-chevron" />
              <strong>{current.name}</strong>
            </div>
            <div className="topbar-right">
              <div className="global-search">
                <Search size={15} />
                <input
                  ref={searchRef}
                  aria-label="全局搜索学员"
                  placeholder="搜索学员、课程…"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    if (e.target.value) go('leads');
                  }}
                />
                <kbd>⌘ K</kbd>
              </div>
              <span className="mode-pill">
                <span />
                {mode === 'live' ? 'AI 已连接' : '演示模式'}
              </span>
              <span className="topbar-divider" />
              <button
                className="notification icon-button"
                aria-label="查看今日提醒"
                onClick={() => go('tasks')}
              >
                <Bell size={18} />
                {m.due > 0 && <i />}
              </button>
              <Avatar name="林老师" small />
            </div>
          </header>
          <main>
            {nav === 'overview' ? (
              <Dashboard />
            ) : nav === 'leads' ? (
              <Leads />
            ) : nav === 'tasks' ? (
              <Tasks />
            ) : nav === 'students' ? (
              <Students />
            ) : nav === 'courses' ? (
              <Courses />
            ) : nav === 'quality' ? (
              <Quality />
            ) : (
              <Settings />
            )}
          </main>
          <footer className="app-footer">
            <span>
              <i className="live-dot" />
              工作区已保存
            </span>
            <span>
              {new Date().toLocaleDateString('zh-CN', {
                timeZone: 'Asia/Shanghai',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long',
              })}{' '}
              <b>·</b> ZHIYU WORKSPACE
            </span>
          </footer>
        </div>
      </div>
      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
      <Modal
        open={guide}
        onClose={() => setGuide(false)}
        title="3 分钟，体验一次有温度的招生"
        description="从一条咨询开始，走完销售与学员运营的完整闭环。"
      >
        <div className="demo-guide">
          {[
            ['录入一条咨询', '点击「录入新咨询」，填入演示案例，生成画像、课程匹配与跟进计划。'],
            ['看清下一步怎么跟', '进入三栏工作台，查看评分依据，采用建议回复，记录沟通。'],
            ['确认报名，衔接运营', '选择课程确认报名，在学员运营中查看开课提醒并更新进度。'],
            ['复盘团队的沟通质量', '进入销售对话质检，导入四段演示聊天，查看遗漏与改进证据。'],
          ].map(([title, desc], i) => (
            <div key={title}>
              <span>{i + 1}</span>
              <div>
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="modal-footer">
          <Badge color="indigo">无需模型密钥即可演示</Badge>
          <Button
            onClick={() => {
              setGuide(false);
              setImportOpen(true);
            }}
          >
            开始体验
            <ArrowRight size={15} />
          </Button>
        </div>
      </Modal>
      <div aria-live="polite" aria-atomic="true" className="toast-announcer">
        {message && (
          <div className="toast" role="status">
            <CheckCircle2 size={17} />
            <span>{message}</span>
            <button aria-label="关闭提示" onClick={() => setMessage('')}>
              <X size={14} />
            </button>
          </div>
        )}
      </div>
    </AppContext.Provider>
  );
}
