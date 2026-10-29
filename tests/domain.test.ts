import test from 'node:test';
import assert from 'node:assert/strict';
import { makeSeed, demoConsultation, qaSample } from '../src/lib/seed';
import { defaultCourses } from '../src/lib/catalog';
import { analyzeDemo, extractProfile, matchCourses } from '../src/lib/ai/demo';
import { reviewDemo } from '../src/lib/ai/quality';
import { applyAction, addPlan, enroll, metrics, operationAdvice } from '../src/lib/domain';
import { workspaceSchema } from '../src/lib/schema';
import { csvCell, dateKey } from '../src/lib/utils';

test('seed contains 50 valid leads, five courses, all outcomes and a consistent metric snapshot', () => {
  const w = workspaceSchema.parse(makeSeed());
  assert.equal(w.leads.length, 50);
  assert.equal(w.courses.length, 5);
  assert.ok(w.students.length > 0);
  assert.equal(w.students.length, w.leads.filter((l) => l.stage === '已报名').length);
  assert.ok(w.leads.filter((l) => l.stage === '已报名').every((l) => l.analysis.grade !== 'D'));
  assert.ok(w.leads.every((l) => l.updatedAt >= l.createdAt));
  assert.equal(metrics(w).newToday, 38);
  assert.ok(w.leads.some((l) => l.stage === '流失'));
  assert.equal(new Set(w.leads.map((l) => l.id)).size, 50);
});
test('consultation produces a grounded end-to-end plan and seven scoring factors', () => {
  const a = analyzeDemo(demoConsultation, defaultCourses);
  assert.equal(a.profile.budgetAmount, 5000);
  assert.equal(a.profile.hoursPerWeek, 6);
  assert.equal(a.profile.age, '28');
  assert.equal(a.profile.foundation, '零基础');
  assert.equal(a.matches[0].courseId, 'pm');
  assert.equal(a.factors.length, 7);
  assert.equal(
    a.score,
    a.factors.reduce((n, x) => n + x.value, 0),
  );
  assert.deepEqual(
    a.followUp.map((x) => x.day),
    [0, 1, 3, 7],
  );
  assert.ok(a.objections.some((x) => x.type === '价格异议'));
  assert.match(a.reply, /4980/);
  assert.equal(a.engine, 'demo');
});
test('matching evaluates prerequisites, budget and time, not keywords alone', () => {
  const p = extractProfile('学员：想学习FDE交付和Agent，零基础，预算2000元，每周能学2小时。');
  const ranked = matchCourses(p, defaultCourses);
  const fde = ranked.find((x) => x.courseId === 'fde')!;
  assert.ok(fde.risks.some((x) => x.includes('零基础')));
  assert.ok(fde.risks.some((x) => x.includes('超预算')));
  assert.ok(fde.risks.some((x) => x.includes('低于')));
  assert.notEqual(ranked[0].courseId, 'fde');
  assert.ok(fde.fit < 40);
});
test('advisor statements never populate student budget, identity or availability', () => {
  const p = extractProfile(
    '学员：我想了解一下课程。\n老师：我是产品经理，预算8000，每周8小时，这周自己决定。',
  );
  assert.equal(p.budgetAmount, null);
  assert.equal(p.hoursPerWeek, null);
  assert.equal(p.occupation, '待确认');
  assert.equal(p.decisionMaker, '待确认');
  assert.ok(p.missing.includes('预算'));
});
test('opt-out has no plan, no invitation and D-grade', () => {
  const a = analyzeDemo('学员：我不需要了，请不要联系，谢谢。', defaultCourses);
  assert.equal(a.stage, '流失');
  assert.equal(a.grade, 'D');
  assert.equal(a.inviteTrial, false);
  assert.deepEqual(a.followUp, []);
  assert.match(a.reply, /停止/);
});
test('enrollment is idempotent and atomically closes sales tasks and creates operations', () => {
  const w = makeSeed();
  const n = w.students.length;
  enroll(w, 'lead-1', 'pm');
  enroll(w, 'lead-1', 'pm');
  assert.equal(w.students.length, n + 1);
  assert.equal(w.students.filter((s) => s.leadId === 'lead-1').length, 1);
  assert.equal(w.leads[0].stage, '已报名');
  assert.ok(
    w.tasks
      .filter((t) => t.leadId === 'lead-1' && t.kind === 'sales')
      .every((t) => t.done && t.status === '已报名'),
  );
  assert.equal(w.tasks.filter((t) => t.leadId === 'lead-1' && t.kind === 'operation').length, 1);
  assert.equal(operationAdvice(w.students[0]).tag, '入学引导');
  assert.throws(
    () =>
      applyAction(w, {
        type: 'lead',
        id: 'lead-1',
        name: '林悦',
        owner: '林老师',
        notes: '',
        stage: '新线索',
        lostReason: '',
      }),
    /学员运营/,
  );
});
test('plan generation avoids duplicate outstanding tasks and loss closes reminders', () => {
  const w = makeSeed();
  const l = w.leads[0];
  addPlan(w, l);
  const n = w.tasks.length;
  addPlan(w, l);
  assert.equal(w.tasks.length, n);
  applyAction(w, {
    type: 'lead',
    id: l.id,
    name: l.name,
    owner: l.owner,
    notes: l.notes,
    stage: '流失',
    lostReason: '暂不学习',
  });
  assert.ok(w.tasks.filter((t) => t.leadId === l.id).every((t) => t.done && t.status === '流失'));
  addPlan(w, l);
  assert.equal(w.tasks.length, n);
});
test('score override, task edit, progress and opportunity changes persist in domain objects', () => {
  const w = makeSeed();
  applyAction(w, {
    type: 'profile',
    id: 'lead-1',
    profile: { ...w.leads[0].analysis.profile, goal: '完成AI原型' },
    reply: '已核对的回复',
    score: 91,
  });
  assert.equal(w.leads[0].analysis.grade, 'A');
  assert.match(w.leads[0].analysis.cautions[0], /人工调整/);
  const task = w.tasks[0];
  applyAction(w, {
    type: 'editTask',
    id: task.id,
    title: '试听确认',
    detail: '明天下午联系',
    due: '2026-10-08T02:00:00.000Z',
  });
  assert.equal(task.title, '试听确认');
  const s = w.students[0];
  applyAction(w, {
    type: 'student',
    id: s.id,
    startsAt: s.startsAt,
    progress: 95,
    homework: 100,
    activity: 90,
    note: '学习反馈良好',
    renewal: '已续费',
    referral: '已转介绍',
  });
  assert.equal(s.renewal, '已续费');
  assert.equal(operationAdvice(s).tag, '成长机会');
  workspaceSchema.parse(w);
});
test('quality flags advisor promises with exact evidence and does not flag student questions', () => {
  const r = reviewDemo(qaSample);
  assert.equal(r.items.length, 4);
  assert.ok(r.items[0].wasted);
  assert.ok(r.items[0].issues.some((x) => x.type === '价格异议未解决'));
  const promise = r.items[1].issues.find((x) => x.type === '夸大或不当承诺');
  assert.ok(promise);
  assert.ok(r.items[1].transcript.includes(promise.evidence));
  assert.equal(
    r.items[2].issues.some((x) => x.type === '夸大或不当承诺'),
    false,
  );
  const safe = reviewDemo({
    conversations: [
      {
        advisor: '林老师',
        leadName: '学员',
        outcome: '未知',
        transcript:
          '学员：保证就业吗？能保证月薪3万吗？\n老师：不能保证就业，请先了解课程大纲和学习目标，明天聊试听。',
      },
    ],
  });
  assert.equal(
    safe.items[0].issues.some((x) => x.type === '夸大或不当承诺'),
    false,
  );
  assert.equal(safe.items[0].outcome, '未知');
});
test('inactive courses are never recommended and last course cannot be disabled', () => {
  const courses = defaultCourses.map((c) => ({ ...c, active: c.id === 'python' }));
  assert.ok(analyzeDemo(demoConsultation, courses).matches.every((x) => x.courseId === 'python'));
  const w = makeSeed();
  w.courses = courses;
  assert.throws(
    () =>
      applyAction(w, {
        type: 'course',
        course: { ...courses.find((c) => c.id === 'python')!, active: false },
      }),
    /至少/,
  );
});
test('CSV export neutralizes spreadsheet formula injection and dates use Shanghai', () => {
  assert.equal(csvCell('=HYPERLINK("x")'), '"\'=HYPERLINK(""x"")"');
  assert.equal(csvCell('hello,world'), '"hello,world"');
  assert.equal(dateKey('2026-10-06T18:00:00.000Z'), '2026-10-07');
});
test('human-confirmed profile overrides survive reanalysis and affect matching', () => {
  const w = makeSeed();
  const l = w.leads[0];
  applyAction(w, {
    type: 'profile',
    id: l.id,
    profile: {
      ...l.analysis.profile,
      goal: '完成可演示的AI产品原型',
      budgetAmount: 3500,
      budget: '3500 元',
    },
    reply: l.analysis.reply,
    score: l.analysis.score,
  });
  const result = analyzeDemo(demoConsultation, w.courses, l.profileOverrides);
  assert.equal(result.profile.goal, '完成可演示的AI产品原型');
  assert.equal(result.profile.budgetAmount, 3500);
  assert.ok(
    result.matches.find((m) => m.courseId === 'pm')?.risks.some((r) => r.includes('超预算')),
  );
});
test('reanalyzing never recreates completed plan steps or overrides manually edited follow-ups', () => {
  const w = makeSeed();
  const l = w.leads[0];
  addPlan(w, l);
  const count = w.tasks.length;
  const day0 = w.tasks.find((t) => t.leadId === l.id && t.planDay === 0)!;
  applyAction(w, { type: 'task', id: day0.id, status: '已联系', done: true });
  const day1 = w.tasks.find((t) => t.leadId === l.id && t.planDay === 1)!;
  applyAction(w, {
    type: 'editTask',
    id: day1.id,
    title: '按约定联系',
    detail: '学员要求周五18点沟通',
    due: '2026-10-09T10:00:00.000Z',
  });
  addPlan(w, l);
  assert.equal(w.tasks.length, count);
  assert.equal(day0.done, true);
  assert.equal(day1.title, '按约定联系');
  assert.equal(day1.detail, '学员要求周五18点沟通');
});
