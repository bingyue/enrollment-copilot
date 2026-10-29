import { guard, body, failure, rateLimit } from '@/lib/api';
import { mutateWorkspace } from '@/lib/store';
import { qualityInput } from '@/lib/schema';
import { review } from '@/lib/ai/provider';
export async function POST(req: Request) {
  try {
    guard(req);
    rateLimit('quality', 10);
    const input = qualityInput.parse(await body(req));
    const report = await review(input);
    const workspace = await mutateWorkspace((w) => {
      w.reports.unshift(report);
      w.reports = w.reports.slice(0, 30);
    });
    return Response.json({ workspace, reportId: report.id });
  } catch (e) {
    return failure(e);
  }
}
