import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { workspaceSchema, type Workspace } from './schema';
import { makeSeed } from './seed';
const storagePath = () => process.env.DATA_PATH || path.join(process.cwd(), '.data/workspace.json');
function db() {
  if (!process.env.SUPABASE_URL) return null;
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase 缺少服务端密钥');
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
async function localWrite(w: Workspace) {
  const p = storagePath();
  await mkdir(path.dirname(p), { recursive: true });
  const temp = p + '.' + crypto.randomUUID() + '.tmp';
  await writeFile(temp, JSON.stringify(w, null, 2), { mode: 0o600 });
  await rename(temp, p);
}
async function read(): Promise<Workspace> {
  const client = db();
  if (client) {
    const id = process.env.WORKSPACE_ID || 'zhiyu-demo';
    let { data, error } = await client
      .from('enrollment_workspaces')
      .select('data,version')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error('数据库读取失败，请检查 Supabase 配置及迁移');
    if (!data) {
      const seed = makeSeed();
      const created = await client
        .from('enrollment_workspaces')
        .upsert(
          { id, data: seed, version: seed.version },
          { onConflict: 'id', ignoreDuplicates: true },
        );
      if (created.error) throw new Error('数据库初始化失败');
      const r = await client
        .from('enrollment_workspaces')
        .select('data,version')
        .eq('id', id)
        .single();
      data = r.data;
      error = r.error;
    }
    if (error || !data) throw new Error('数据库工作区不可用');
    return workspaceSchema.parse({ ...data.data, version: data.version });
  }
  try {
    return workspaceSchema.parse(
      JSON.parse(await readFile(/* turbopackIgnore: true */ storagePath(), 'utf8')),
    );
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT')
      throw new Error('本地数据读取失败；已保留原文件，请检查数据备份');
    const seed = makeSeed();
    await localWrite(seed);
    return seed;
  }
}
const queueGlobal = globalThis as typeof globalThis & { workspaceQueue?: Promise<unknown> };
function locked<T>(job: () => Promise<T>): Promise<T> {
  const run = (queueGlobal.workspaceQueue || Promise.resolve()).then(job, job);
  queueGlobal.workspaceQueue = run.catch(() => {});
  return run;
}
export function readWorkspace() {
  return locked(read);
}
export function mutateWorkspace(fn: (w: Workspace) => Workspace | void) {
  return locked(async () => {
    for (let attempt = 0; attempt < 4; attempt++) {
      const current = await read();
      const base = current.version;
      const next = fn(current) || current;
      next.version = base + 1;
      workspaceSchema.parse(next);
      const client = db();
      if (!client) {
        await localWrite(next);
        return next;
      }
      const { data, error } = await client
        .from('enrollment_workspaces')
        .update({ data: next, version: next.version, updated_at: new Date().toISOString() })
        .eq('id', process.env.WORKSPACE_ID || 'zhiyu-demo')
        .eq('version', base)
        .select('id');
      if (error) throw new Error('数据库保存失败，请重试');
      if (data?.length) return next;
    }
    throw new Error('数据正在被其他会话更新，请重试');
  });
}
