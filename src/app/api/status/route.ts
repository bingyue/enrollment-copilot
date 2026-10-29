import { isAuthorized } from '@/lib/api';
import { providerStatus } from '@/lib/ai/provider';
export async function GET(req: Request) {
  return Response.json(
    {
      authorized: isAuthorized(req),
      passwordRequired: !!process.env.APP_PASSWORD || process.env.APP_PUBLIC === 'true',
      ...providerStatus(),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
