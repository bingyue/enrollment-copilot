import { test, expect } from '@playwright/test';
const consult =
  '学员：我叫验收学员，28岁，现在是产品经理，有3年工作经验，想学习AI产品设计，完成一个自己的产品原型。\n学员：零基础，预算5000元，每周可以投入6小时，希望这周开始，自己决定。我觉得有点贵，能先试听吗？';
test.beforeEach(async ({ request }) => {
  const r = await request.post('/api/workspace', {
    data: { type: 'reset', confirm: 'RESET_DEMO' },
  });
  expect(r.ok()).toBeTruthy();
});
test('consultation → profile → recommendations → reply → plan → enrollment → student operations → persistence', async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '今天哪些学员最值得跟进？' })).toBeVisible();
  await page.getByRole('button', { name: '录入新咨询', exact: true }).click();
  const modal = page.getByRole('dialog');
  await modal.getByLabel('学员姓名').fill('验收学员');
  await modal.getByLabel('咨询记录').fill(consult);
  await modal.getByRole('button', { name: '分析并建立档案' }).click();
  await expect(modal).toBeHidden();
  await expect(page.locator('.detail-heading h2')).toHaveText('验收学员');
  await page.getByRole('tab', { name: '学员画像' }).click();
  await expect(page.locator('.profile-grid')).toContainText('5000 元');
  await expect(page.locator('.profile-grid')).toContainText('零基础');
  await page.getByRole('tab', { name: '课程方案' }).click();
  await expect(page.locator('.recommended-course').first()).toContainText('AI 产品经理成长营');
  await expect(page.locator('.recommended-course').first()).toContainText('4,980');
  await page.getByRole('button', { name: '评分依据', exact: true }).click();
  await expect(page.locator('.score-factors>div')).toHaveCount(7);
  await page.getByRole('button', { name: '行动建议', exact: true }).click();
  await page.getByRole('button', { name: '采用回复', exact: true }).click();
  await expect(page.getByRole('textbox', { name: '沟通内容' })).not.toHaveValue('');
  await page.getByRole('button', { name: '保存沟通记录', exact: true }).click();
  await expect(page.getByRole('textbox', { name: '沟通内容' })).toHaveValue('');
  await page.getByRole('tab', { name: '跟进计划' }).click();
  await expect(page.locator('.plan-item')).toHaveCount(4);
  await page.getByRole('button', { name: '确认报名', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: '确认报名', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByRole('button', { name: '进入学员运营' })).toBeVisible();
  await page.getByRole('button', { name: '进入学员运营' }).click();
  await expect(page.locator('.student-card').filter({ hasText: '验收学员' })).toBeVisible();
  const card = page.locator('.student-card').filter({ hasText: '验收学员' });
  await card.getByRole('button', { name: '更新进展' }).click();
  const edit = page.getByRole('dialog');
  await edit.getByLabel('学习进度（%）').fill('93');
  await edit.getByLabel('作业完成率（%）').fill('100');
  await edit.getByLabel('活跃度（%）').fill('90');
  await edit.getByLabel('续费机会').selectOption('已续费');
  await edit.getByLabel('转介绍机会').selectOption('已转介绍');
  await edit.getByRole('button', { name: '保存进展' }).click();
  await expect(edit).toBeHidden();
  await page.reload();
  await expect(page.locator('.student-card').filter({ hasText: '验收学员' })).toContainText('93%');
  await expect(page.locator('.student-card').filter({ hasText: '验收学员' })).toContainText(
    '已续费',
  );
  const w = await (await request.get('/api/workspace')).json();
  const l = w.leads.find((l: any) => l.name === '验收学员');
  expect(w.students.filter((s: any) => s.leadId === l.id)).toHaveLength(1);
  expect(
    w.tasks.filter((t: any) => t.leadId === l.id && t.kind === 'sales').every((t: any) => t.done),
  ).toBeTruthy();
  expect(w.tasks.some((t: any) => t.leadId === l.id && t.kind === 'operation')).toBeTruthy();
  expect(errors).toEqual([]);
});
test('course editing, search, follow-up completion and task date editing', async ({ page }) => {
  await page.goto('/?view=courses');
  await page.getByRole('button', { name: '编辑AI 产品经理成长营', exact: true }).click();
  await page.getByRole('dialog').getByLabel('价格（元）').fill('4680');
  await page.getByRole('button', { name: '保存课程', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(
    page.locator('.catalog-card').filter({ hasText: 'AI 产品经理成长营' }),
  ).toContainText('4,680');
  await page.getByRole('textbox', { name: '全局搜索学员' }).fill('张子涵');
  await expect(page.locator('.lead-item')).toHaveCount(1);
  await expect(page.locator('.detail-heading')).toContainText('张子涵');
  await page.getByRole('textbox', { name: '搜索学员', exact: true }).fill('没有这个学员');
  await expect(page.getByRole('heading', { name: '没有匹配的学员' })).toBeVisible();
  await page
    .locator('.sidebar nav')
    .getByRole('button', { name: /跟进任务/ })
    .click();
  const first = page.locator('.task-row').first();
  await first.getByRole('button', { name: /编辑任务/ }).click();
  await page.getByRole('dialog').getByLabel('任务标题').fill('验收试听预约');
  await page.getByRole('dialog').getByRole('button', { name: '保存任务' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByRole('heading', { name: '验收试听预约' })).toBeVisible();
  await page
    .locator('.task-row')
    .filter({ hasText: '验收试听预约' })
    .getByRole('button', { name: /完成任务/ })
    .click();
  await expect(page.getByRole('heading', { name: '验收试听预约' })).toBeHidden();
  await page.getByRole('button', { name: '已完成', exact: true }).click();
  await expect(page.getByRole('heading', { name: '验收试听预约' })).toBeVisible();
});
test('bulk conversation quality imports, advisor evidence and known-result metrics', async ({
  page,
}) => {
  await page.goto('/?view=quality');
  await page.getByRole('button', { name: '批量导入对话', exact: true }).click();
  await page.getByRole('button', { name: '填入 4 段演示对话' }).click();
  await page.getByRole('button', { name: '开始质检', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.locator('.quality-row')).toHaveCount(4);
  await page.getByRole('button', { name: '高风险对话', exact: true }).click();
  await expect(page.locator('.quality-row')).toHaveCount(2);
  await page
    .locator('.quality-row')
    .filter({ hasText: '吴子轩' })
    .getByRole('button', { name: '查看证据与建议' })
    .click();
  await expect(page.getByRole('dialog')).toContainText('夸大或不当承诺');
  await expect(page.locator('.quality-issue')).toContainText(['保证就业']);
  await page.getByRole('button', { name: '关闭弹窗' }).click();
  await page.reload();
  await expect(page.getByRole('heading', { name: '好的招生，不该只靠个人经验' })).toBeVisible();
});
test('manual profile correction and operation recommendations create actionable tasks', async ({
  page,
  request,
}) => {
  await page.goto('/?view=leads&lead=lead-1');
  await page.getByRole('tab', { name: '学员画像' }).click();
  await page.getByRole('button', { name: '人工校正' }).click();
  await page
    .getByRole('dialog')
    .getByLabel('学习目标', { exact: true })
    .fill('完成一份可演示的AI产品原型');
  await page.getByRole('dialog').getByLabel('意向评分（0–100）').fill('88');
  await page.getByRole('button', { name: '保存人工校正' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.locator('.profile-grid')).toContainText('完成一份可演示的AI产品原型');
  await page.locator('.sidebar nav').getByRole('button', { name: '学员运营', exact: true }).click();
  await page.getByRole('button', { name: '生成今日关注名单' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: '生成运营待办' }).first().click();
  await expect(page.getByRole('status')).toContainText('已加入今日待办');
  const w = await (await request.get('/api/workspace')).json();
  expect(w.tasks.some((t: any) => t.kind === 'operation' && t.title.includes('学习'))).toBeTruthy();
});
test('all seven views render without errors, support mobile navigation and have no horizontal overflow', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  for (const view of ['overview', 'leads', 'tasks', 'students', 'courses', 'quality', 'settings']) {
    await page.goto('/?view=' + view);
    await expect(page.locator('main h1')).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
      .toBe(true);
  }
  await page.getByRole('button', { name: '展开导航' }).click();
  await page.locator('.sidebar nav').getByRole('button', { name: '今日概览', exact: true }).click();
  await expect(page.getByRole('heading', { name: '今天哪些学员最值得跟进？' })).toBeVisible();
  expect(errors).toEqual([]);
});
test('invalid imports, cross-origin writes and invalid enrollment fail without mutating data', async ({
  request,
}) => {
  const initial = await (await request.get('/api/workspace')).json();
  let r = await request.post('/api/analyze', {
    data: { name: '', transcript: 'x', source: '微信', owner: '林老师' },
  });
  expect(r.status()).toBe(400);
  r = await request.post('/api/workspace', {
    headers: { Origin: 'https://untrusted.example' },
    data: { type: 'reset', confirm: 'RESET_DEMO' },
  });
  expect(r.status()).toBe(403);
  r = await request.post('/api/workspace', {
    data: { type: 'enroll', id: 'lead-1', courseId: 'fake' },
  });
  expect(r.status()).toBe(400);
  const after = await (await request.get('/api/workspace')).json();
  expect(after.version).toBe(initial.version);
  expect(after.leads.length).toBe(50);
});
