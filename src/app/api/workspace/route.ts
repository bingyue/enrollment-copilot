import { guard, body, failure } from '@/lib/api';
import { readWorkspace, mutateWorkspace } from '@/lib/store';
import { actionSchema } from '@/lib/schema';
import { applyAction } from '@/lib/domain';
import { makeSeed } from '@/lib/seed';
export const runtime = 'nodejs';
export async function GET(req: Request) {
  try {
    guard(req);
    return Response.json(await readWorkspace(), { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request) {
  try {
    guard(req);
    const a = actionSchema.parse(await body(req));
    return Response.json(
      await mutateWorkspace((w) => (a.type === 'reset' ? makeSeed() : applyAction(w, a))),
    );
  } catch (e) {
    return failure(e);
  }
}
