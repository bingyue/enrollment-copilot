import { createHmac, timingSafeEqual } from 'node:crypto';
import { ZodError } from 'zod';
import { DomainError } from './domain';
export class HttpError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
const session = (expiry: string) =>
  createHmac('sha256', process.env.APP_PASSWORD || 'local-demo')
    .update('zhiyu:' + expiry)
    .digest('hex');
export function createSession() {
  const expiry = String(Date.now() + 12 * 3600000);
  return `${expiry}.${session(expiry)}`;
}
export function isAuthorized(req: Request) {
  if (!process.env.APP_PASSWORD) return process.env.APP_PUBLIC !== 'true';
  const token = req.headers.get('cookie')?.match(/(?:^|;\s*)zhiyu_session=([^;]+)/)?.[1] || '';
  const [expiry, signature] = token.split('.');
  if (
    !expiry ||
    !/^\d+$/.test(expiry) ||
    !signature ||
    !/[a-f0-9]{64}/.test(signature) ||
    Number(expiry) < Date.now()
  )
    return false;
  const expected = session(expiry);
  return (
    Buffer.byteLength(signature) === Buffer.byteLength(expected) &&
    timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  );
}
const globalApi = globalThis as typeof globalThis & {
  apiWindows?: Map<string, { at: number; count: number }>;
};
export function checkOrigin(req: Request) {
  const origin = req.headers.get('origin');
  if (!origin) return;
  try {
    const o = new URL(origin);
    const host = req.headers.get('host') || new URL(req.url).host;
    const allowed = process.env.APP_ORIGIN
      ? o.origin === new URL(process.env.APP_ORIGIN).origin
      : o.host === host;
    if (!['http:', 'https:'].includes(o.protocol) || !allowed) throw new Error();
  } catch {
    throw new HttpError('请求来源不受信任', 403);
  }
}
export function guard(req: Request) {
  if (!isAuthorized(req))
    throw new HttpError(
      process.env.APP_PUBLIC === 'true' && !process.env.APP_PASSWORD
        ? '公开运行前必须配置 APP_PASSWORD'
        : '请先输入工作区访问密码',
      401,
    );
  checkOrigin(req);
}
export function rateLimit(key: string, max = 30) {
  const map = (globalApi.apiWindows ||= new Map());
  const item = map.get(key);
  const now = Date.now();
  if (!item || now - item.at > 60000) {
    map.set(key, { at: now, count: 1 });
    return;
  }
  if (item.count >= max) throw new HttpError('请求较频繁，请稍后重试', 429);
  item.count++;
}
export async function body(req: Request) {
  if (Number(req.headers.get('content-length') || 0) > 350000) throw new HttpError('导入内容过大');
  const s = await req.text();
  if (s.length > 350000) throw new HttpError('导入内容过大');
  try {
    return JSON.parse(s);
  } catch {
    throw new HttpError('请求格式无效');
  }
}
export function failure(e: unknown) {
  if (e instanceof ZodError)
    return Response.json({ error: e.issues[0]?.message || '输入不符合要求' }, { status: 400 });
  if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
  if (e instanceof DomainError) return Response.json({ error: e.message }, { status: 400 });
  console.error('[zhiyu]', e instanceof Error ? e.message : 'unknown error');
  return Response.json(
    { error: e instanceof Error ? e.message : '暂时无法完成操作，请重试' },
    { status: 500 },
  );
}
