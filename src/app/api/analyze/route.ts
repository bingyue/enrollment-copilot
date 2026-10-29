import { guard, body, failure, rateLimit } from '@/lib/api';
import { readWorkspace, mutateWorkspace } from '@/lib/store';
import { analyzeInput } from '@/lib/schema';
import { analyze } from '@/lib/ai/provider';
import { addPlan, findLead, DomainError } from '@/lib/domain';
export const runtime = 'nodejs';
export async function POST(req: Request) {
  try {
    guard(req);
    rateLimit('analyze');
    const input = analyzeInput.parse(await body(req));
    const before = await readWorkspace();
    if (input.leadId && ['已报名', '流失'].includes(findLead(before, input.leadId).stage))
      throw new DomainError('已报名或流失记录请先在对应模块处理');
    const analysis = await analyze(
      input.transcript,
      before.courses,
      input.leadId ? findLead(before, input.leadId).profileOverrides : undefined,
    );
    const leadId = input.leadId || crypto.randomUUID();
    const workspace = await mutateWorkspace((w) => {
      const now = new Date().toISOString();
      if (JSON.stringify(w.courses) !== JSON.stringify(before.courses))
        throw new DomainError('分析期间课程库发生变化，请重新分析');
      if (input.leadId) {
        const l = findLead(w, input.leadId);
        if (l.updatedAt !== findLead(before, input.leadId).updatedAt)
          throw new DomainError('分析期间线索信息有更新，请重新分析');
        if (['已报名', '流失'].includes(l.stage))
          throw new DomainError('线索阶段已更新，请刷新后继续');
        l.analysis = analysis;
        l.stage = analysis.stage;
        l.updatedAt = now;
        if (analysis.stage === '流失') {
          l.lostReason = '学员明确拒绝继续联系';
          w.tasks
            .filter((t) => t.leadId === l.id && t.kind === 'sales')
            .forEach((t) => {
              t.done = true;
              t.status = '流失';
            });
        }
        l.messages.push({
          id: crypto.randomUUID(),
          role: 'system',
          content: '已根据最新沟通重新分析需求、课程匹配与跟进建议。',
          at: now,
        });
        addPlan(w, l);
      } else {
        const l = {
          id: leadId,
          name: input.name,
          source: input.source,
          owner: input.owner,
          stage: analysis.stage,
          createdAt: now,
          updatedAt: now,
          enrolledAt: null,
          lostReason: analysis.stage === '流失' ? '学员明确拒绝继续联系' : '',
          analysis,
          messages: [
            {
              id: crypto.randomUUID(),
              role: 'student' as const,
              content: input.transcript,
              at: now,
            },
          ],
          notes: '',
        };
        w.leads.unshift(l);
        addPlan(w, l);
      }
    });
    return Response.json({ workspace, leadId });
  } catch (e) {
    return failure(e);
  }
}
