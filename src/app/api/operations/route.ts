import { guard, failure, rateLimit } from '@/lib/api';
import { readWorkspace } from '@/lib/store';
import { analyzeOperations } from '@/lib/ai/provider';
import { operationAdvice } from '@/lib/domain';
export async function POST(req: Request) {
  try {
    guard(req);
    rateLimit('operations', 10);
    const w = await readWorkspace();
    if (process.env.AI_MODE === 'live') {
      const r = await analyzeOperations({
        students: w.students.map((s) => ({
          ...s,
          name: w.leads.find((l) => l.id === s.leadId)?.name,
          course: w.courses.find((c) => c.id === s.courseId),
        })),
      });
      if (r.actions.some((a) => !w.students.some((s) => s.id === a.studentId)))
        throw new Error('模型返回无效学员引用，请重试');
      return Response.json({ ...r, engine: 'live' });
    }
    return Response.json({
      summary: `已检查 ${w.students.length} 名学员，建议优先关注 ${w.students.filter((s) => operationAdvice(s).priority === '高').length} 名需要学习支持的学员。`,
      engine: 'demo',
      actions: w.students
        .map((s) => ({ studentId: s.id, ...operationAdvice(s) }))
        .sort(
          (a, b) => ({ 高: 0, 中: 1, 低: 2 })[a.priority] - { 高: 0, 中: 1, 低: 2 }[b.priority],
        ),
    });
  } catch (e) {
    return failure(e);
  }
}
