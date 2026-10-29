import { timingSafeEqual } from 'node:crypto';
import { body, createSession, failure, HttpError, rateLimit, checkOrigin } from '@/lib/api';
export async function POST(req: Request) {
  try {
    rateLimit('login', 10);
    checkOrigin(req);
    const data = await body(req);
    const expected = process.env.APP_PASSWORD || '';
    if (
      !expected ||
      typeof data.password !== 'string' ||
      Buffer.byteLength(data.password) !== Buffer.byteLength(expected) ||
      !timingSafeEqual(Buffer.from(data.password), Buffer.from(expected))
    )
      throw new HttpError('访问密码不正确', 401);
    return Response.json(
      { ok: true },
      {
        headers: {
          'Set-Cookie': `zhiyu_session=${createSession()}; Path=/; HttpOnly; SameSite=Strict; Max-Age=43200${(process.env.APP_ORIGIN || req.url).startsWith('https:') ? '; Secure' : ''}`,
        },
      },
    );
  } catch (e) {
    return failure(e);
  }
}
