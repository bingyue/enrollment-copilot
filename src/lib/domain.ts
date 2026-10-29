import type { Action, Workspace, Lead, Student } from './schema';
import { addDays, dateKey, gradeOf } from './utils';
export class DomainError extends Error {}
export function findLead(w: Workspace, id: string) {
  const l = w.leads.find((l) => l.id === id);
  if (!l) throw new DomainError('线索不存在');
  return l;
}
export function enroll(w: Workspace, id: string, courseId: string) {
  const l = findLead(w, id);
  const c = w.courses.find((c) => c.id === courseId && c.active);
  if (!c) throw new DomainError('请选择有效课程');
  if (l.stage === '流失') throw new DomainError('请先将流失线索恢复到沟通阶段');
  if (w.students.some((s) => s.leadId === id)) return;
  const now = new Date().toISOString();
  l.stage = '已报名';
  l.enrolledAt = now;
  l.updatedAt = now;
  l.analysis.stage = '已报名';
  w.tasks
    .filter((t) => t.leadId === id && t.kind === 'sales')
    .forEach((t) => {
      t.done = true;
      t.status = '已报名';
    });
  w.students.unshift({
    id: crypto.randomUUID(),
    leadId: id,
    courseId,
    enrolledAt: now,
    startsAt: addDays(now, 3),
    progress: 0,
    homework: 0,
    activity: 0,
    lastActive: now,
    note: '新报名，待完成入学引导与学习计划确认。',
    renewal: '待评估',
    referral: '待培育',
  });
  w.tasks.unshift({
    id: crypto.randomUUID(),
    leadId: id,
    title: '完成入学引导与开课提醒',
    detail: `确认「${c.name}」开课时间，发送学习指引，约定每周学习计划。`,
    due: now,
    status: '待跟进',
    done: false,
    kind: 'operation',
    createdAt: now,
  });
  l.messages.push({
    id: crypto.randomUUID(),
    role: 'system',
    content: `已确认报名「${c.name}」，自动进入学员运营并创建入学引导任务。`,
    at: now,
  });
}
export function addPlan(w: Workspace, l: Lead) {
  if (['已报名', '流失'].includes(l.stage)) return;
  const now = new Date().toISOString();
  l.analysis.followUp.forEach((p) => {
    const existing = w.tasks.find(
      (t) =>
        t.leadId === l.id && t.kind === 'sales' && (t.planDay === p.day || t.title === p.title),
    );
    if (existing) {
      existing.planDay = p.day;
      if (!existing.done && !existing.manual) existing.detail = p.detail;
      return;
    }
    w.tasks.push({
      id: crypto.randomUUID(),
      leadId: l.id,
      title: p.title,
      detail: p.detail,
      due: addDays(l.createdAt, p.day),
      status: '待跟进',
      done: false,
      kind: 'sales',
      planDay: p.day,
      createdAt: now,
    });
  });
}
export function applyAction(w: Workspace, a: Action) {
  if (a.type === 'reset') throw new DomainError('重置需通过独立处理');
  if (a.type === 'course') {
    const index = w.courses.findIndex((c) => c.id === a.course.id);
    if (!a.course.active && w.courses.filter((c) => c.active && c.id !== a.course.id).length === 0)
      throw new DomainError('至少需要一门启用课程');
    if (index < 0) w.courses.push(a.course);
    else w.courses[index] = a.course;
  } else if (a.type === 'task') {
    const task = w.tasks.find((t) => t.id === a.id);
    if (!task) throw new DomainError('任务不存在');
    const lead = findLead(w, task.leadId);
    if (task.kind === 'sales' && ['已报名', '流失'].includes(lead.stage))
      throw new DomainError('该线索已结束销售跟进，请在学员运营中管理后续任务');
    if (a.status === '已报名') throw new DomainError('请在线索详情确认报名课程，完成报名流转');
    task.status = a.status;
    task.done = a.done;
    if (a.status === '流失' && task.kind === 'sales') {
      lead.stage = '流失';
      lead.lostReason = '跟进任务中标记流失';
      lead.analysis.stage = '流失';
      w.tasks
        .filter((t) => t.leadId === lead.id && t.kind === 'sales')
        .forEach((t) => {
          t.status = '流失';
          t.done = true;
        });
    }
  } else if (a.type === 'editTask') {
    const task = w.tasks.find((t) => t.id === a.id);
    if (!task) throw new DomainError('任务不存在');
    if (task.kind === 'sales' && task.planDay === undefined)
      task.planDay = findLead(w, task.leadId).analysis.followUp.find(
        (p) => p.title === task.title,
      )?.day;
    Object.assign(task, { title: a.title, detail: a.detail, due: a.due, manual: true });
  } else if (a.type === 'student') {
    const student = w.students.find((s) => s.id === a.id);
    if (!student) throw new DomainError('学员不存在');
    Object.assign(student, {
      startsAt: a.startsAt,
      progress: a.progress,
      homework: a.homework,
      activity: a.activity,
      note: a.note,
      renewal: a.renewal,
      referral: a.referral,
      lastActive: new Date().toISOString(),
    });
  } else if (a.type === 'operationTask') {
    const s = w.students.find((s) => s.id === a.id);
    if (!s) throw new DomainError('学员不存在');
    if (!w.tasks.some((t) => t.leadId === s.leadId && t.title === a.title && !t.done))
      w.tasks.unshift({
        id: crypto.randomUUID(),
        leadId: s.leadId,
        title: a.title,
        detail: a.detail,
        due: new Date().toISOString(),
        status: '待跟进',
        done: false,
        kind: 'operation',
        createdAt: new Date().toISOString(),
      });
  } else {
    const l = findLead(w, a.id);
    l.updatedAt = new Date().toISOString();
    if (a.type === 'enroll') enroll(w, a.id, a.courseId);
    if (a.type === 'lead') {
      if (a.stage === '已报名' && l.stage !== '已报名')
        throw new DomainError('请使用「确认报名」选择课程并自动进入学员运营');
      if (l.stage === '已报名' && a.stage !== '已报名')
        throw new DomainError('已报名学员请在学员运营中管理');
      Object.assign(l, {
        name: a.name,
        owner: a.owner,
        notes: a.notes,
        stage: a.stage,
        lostReason: a.lostReason,
      });
      l.analysis.stage = a.stage;
      if (a.stage === '流失')
        w.tasks
          .filter((t) => t.leadId === l.id && t.kind === 'sales')
          .forEach((t) => {
            t.status = '流失';
            t.done = true;
          });
    }
    if (a.type === 'profile') {
      l.profileOverrides = {
        ...l.profileOverrides,
        ...Object.fromEntries(
          Object.entries(a.profile).filter(
            ([key, value]) =>
              JSON.stringify(value) !==
              JSON.stringify(l.analysis.profile[key as keyof typeof a.profile]),
          ),
        ),
      };
      l.analysis.profile = a.profile;
      l.analysis.reply = a.reply;
      if (l.analysis.score !== a.score) {
        l.analysis.score = a.score;
        l.analysis.grade = gradeOf(a.score);
        l.analysis.cautions = [
          '评分已由顾问人工调整；下方各维度保留最近一次分析依据。',
          ...l.analysis.cautions.filter((x) => !x.startsWith('评分已由顾问')),
        ];
      }
      l.messages.push({
        id: crypto.randomUUID(),
        role: 'system',
        content: '顾问已人工校正客户画像、建议回复或评分。',
        at: l.updatedAt,
      });
    }
    if (a.type === 'message')
      l.messages.push({
        id: crypto.randomUUID(),
        role: a.role,
        content: a.content,
        at: l.updatedAt,
      });
    if (a.type === 'plan') addPlan(w, l);
  }
  return w;
}
export function operationAdvice(s: Student) {
  const isNew = dateKey(s.startsAt) >= dateKey();
  if (isNew && s.progress === 0)
    return {
      priority: '中' as const,
      tag: '入学引导',
      reason: '即将开课，先建立学习节奏',
      title: '确认开课安排与学习计划',
      detail: '核对开课日期，提供入学资料，确认每周可投入时间。',
    };
  if (s.activity < 40 || (s.progress < 20 && s.homework < 30))
    return {
      priority: '高' as const,
      tag: '掉队风险',
      reason: `活跃度 ${s.activity}% · 作业完成 ${s.homework}%`,
      title: '了解学习困难，调整学习节奏',
      detail: '先询问近期学习障碍，提供一次答疑和小步学习计划，不急于推荐续费。',
    };
  if (s.progress >= 85 && s.activity >= 70)
    return {
      priority: '低' as const,
      tag: '成长机会',
      reason: `课程完成 ${s.progress}%，可沟通下一阶段目标`,
      title: s.renewal === '已续费' ? '跟进进阶学习体验' : '回访体验，评估进阶与转介绍意愿',
      detail: '了解学习收获与后续目标，在学员满意并同意后介绍进阶课程或转介绍。',
    };
  return {
    priority: '低' as const,
    tag: '稳定学习',
    reason: `学习进度 ${s.progress}% · 活跃度 ${s.activity}%`,
    title: '进行阶段学习回访',
    detail: '检查作业反馈，鼓励分享学习问题，确认下一阶段目标。',
  };
}
export function metrics(w: Workspace) {
  const today = dateKey();
  const active = w.leads.filter((l) => !['已报名', '流失'].includes(l.stage));
  const todayNew = w.leads.filter((l) => dateKey(l.createdAt) === today);
  const enrolled = w.leads.filter((l) => l.stage === '已报名');
  const durations = enrolled
    .filter((l) => l.enrolledAt)
    .map((l) =>
      Math.max(0, (new Date(l.enrolledAt!).getTime() - new Date(l.createdAt).getTime()) / 86400000),
    );
  return {
    total: w.leads.length,
    newToday: todayNew.length,
    valid: w.leads.filter((l) => l.analysis.grade !== 'D').length,
    high: active.filter((l) => l.analysis.grade === 'A').length,
    highToday: todayNew.filter((l) => l.analysis.grade === 'A').length,
    price: active.filter((l) => l.analysis.objections.some((o) => o.type === '价格异议')).length,
    trial: active.filter((l) => l.analysis.inviteTrial).length,
    enrolled: enrolled.length,
    enrolledToday: enrolled.filter((l) => l.enrolledAt && dateKey(l.enrolledAt) === today).length,
    conversion: w.leads.length ? Math.round((enrolled.length / w.leads.length) * 100) : 0,
    cycle: durations.length
      ? (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(1)
      : '0',
    due: w.tasks.filter((t) => !t.done && dateKey(t.due) <= today).length,
  };
}
