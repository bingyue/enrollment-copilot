import { analysisSchema, type Analysis, type Course, type Profile, factorNames } from '../schema';
import { gradeOf } from '../utils';

const studentText = (text: string) => {
  const lines = text.split('\n');
  const marked = lines.filter((x) => /^(学员|客户|学生|咨询者|用户)[：:]/.test(x.trim()));
  return marked.length ? marked.map((x) => x.replace(/^[^：:]+[：:]/, '')).join('\n') : text;
};
export function extractProfile(transcript: string): Profile {
  const t = studentText(transcript);
  const budgetMatch = t.match(
    /(?:预算|能接受|最多|可接受|计划花)[约大概在是为不超过：:\s]*(\d+(?:\.\d+)?)\s*(万|千|k|K|元|块)?/,
  );
  const budget = budgetMatch
    ? Math.round(
        Number(budgetMatch[1]) *
          (budgetMatch[2] === '万' ? 10000 : /千|k|K/.test(budgetMatch[2] || '') ? 1000 : 1),
      )
    : null;
  const hours = t.match(/(?:每周|一周|周末)[^。\n，,]{0,10}?(\d+(?:\.\d+)?)\s*(?:个)?小时/);
  const field = (r: RegExp, fall = '待确认') => t.match(r)?.[1]?.trim() || fall;
  const occupation = field(
    /(?:我是|目前是|现在是|从事|做了?\d*年?)([^。\n，,]{2,14}(?:产品经理|运营|开发|程序员|设计师|教师|老师|销售|财务|人事|学生|店主))/,
    /产品经理/.test(t)
      ? '产品经理'
      : /电商|店铺|店主/.test(t)
        ? '电商从业者'
        : /程序员|开发|工程师/.test(t)
          ? '开发从业者'
          : /行政|文员|财务/.test(t)
            ? '职场办公人群'
            : /学生|在校/.test(t)
              ? '在校学生'
              : '待确认',
  );
  const explicitGoal = field(/(?:想要?|希望|目标是|打算)([^。\n！？]{3,90})/, '');
  const goal = explicitGoal || '学习目标待进一步了解';
  const interest = /FDE|交付|Agent|智能体|RAG/i.test(t)
    ? 'AI / FDE'
    : /产品经理|产品设计|产品转型/.test(t)
      ? 'AI 产品经理'
      : /电商|店铺|选品/.test(t)
        ? '电商运营'
        : /Python|编程|自动化|代码/i.test(t)
          ? 'Python'
          : /自媒体|新媒体|短视频|小红书|公众号/.test(t)
            ? '新媒体运营'
            : '待确认';
  const concern = /太贵|贵了|有点贵|超预算|价格高/.test(t)
    ? '价格与价值是否匹配'
    : /没时间|没空|加班|时间不够/.test(t)
      ? '学习时间不足'
      : /学不会|零基础|跟不上|没基础/.test(t)
        ? '担心基础不足、跟不上'
        : /工作|就业|薪资/.test(t)
          ? '能力提升与就业预期'
          : /比较|别家|其他机构/.test(t)
            ? '与其他机构比较'
            : /家人|父母|老公|老婆/.test(t)
              ? '需与家人商量'
              : /效果|有用|实用/.test(t)
                ? '课程效果待验证'
                : /考虑|观望/.test(t)
                  ? '仍在考虑'
                  : '待进一步了解';
  const foundation = /零基础|没基础|不会编程|没学过|不懂代码/.test(t)
    ? '零基础'
    : /会.*Python|Python.*基础|开发|写过代码|编程基础/i.test(t)
      ? '有编程基础'
      : /工作|经验|运营|产品经理/.test(t)
        ? '有业务经验，技术基础待确认'
        : '待确认';
  const availability = field(/((?:每周|一周|周末|晚上|下班后)[^。\n]{1,35})/);
  const decisionCycle = /这周|本周|马上|尽快|最近就|现在就|今天/.test(t)
    ? '本周内'
    : /下个月|下月/.test(t)
      ? '下个月'
      : /下周/.test(t)
        ? '下周'
        : /不着急|先看看|观望/.test(t)
          ? '暂不明确'
          : '待确认';
  const p: Profile = {
    identity:
      occupation === '在校学生' ? '在校学习' : occupation === '待确认' ? '待确认' : '职场学习',
    age: field(/(\d{2})\s*岁/),
    occupation,
    foundation,
    goal,
    budget: budget === null ? '待确认' : `${budget} 元`,
    budgetAmount: budget,
    availability,
    hoursPerWeek: hours ? Number(hours[1]) : null,
    interest,
    concern,
    decisionCycle,
    decisionMaker: /自己决定|我决定|自己做主/.test(t)
      ? '本人决定'
      : /家人|父母|商量|审批|老板/.test(t)
        ? '需共同决策'
        : '待确认',
    missing: [],
  };
  p.missing = (
    [
      ['预算', p.budget],
      ['每周可投入时间', p.hoursPerWeek === null ? '待确认' : '已知'],
      ['决策人', p.decisionMaker],
      ['职业', p.occupation],
      ['决策周期', p.decisionCycle],
    ] as const
  )
    .filter(([, v]) => v === '待确认')
    .map(([k]) => k);
  return p;
}
export function matchCourses(p: Profile, courses: Course[]) {
  return courses
    .filter((c) => c.active)
    .map((c) => {
      let fit = 42;
      const reasons: string[] = [];
      const risks: string[] = [];
      const intent = (p.interest + ' ' + p.goal).toLowerCase();
      const domains: Record<string, RegExp> = {
        fde: /fde|agent|rag|交付|智能体|应用开发/,
        pm: /产品|原型|需求文档/,
        ecommerce: /电商|店铺|选品|投放/,
        python: /python|自动化|编程|数据处理/,
        media: /媒体|短视频|内容|账号|创作/,
      };
      const domainHit =
        domains[c.id]?.test(intent) || c.tags.some((t) => intent.includes(t.toLowerCase()));
      if (domainHit) {
        fit += 28;
        reasons.push(`学习目标「${p.goal}」与课程方向「${c.direction}」相符`);
      } else {
        fit -= 15;
        risks.push('课程方向与已表达的目标关联较弱');
      }
      if (p.foundation === '零基础' && c.id === 'fde') {
        fit -= 32;
        risks.push('当前为零基础，需先完成编程预习与基础测评');
      } else if (p.foundation === '零基础' && /零基础|无需/.test(c.prerequisites)) {
        fit += 10;
        reasons.push('课程先修要求适合当前基础');
      } else if (p.foundation === '有编程基础' && c.id === 'fde') {
        fit += 12;
        reasons.push('已有编程基础，可以进入项目交付练习');
      } else if (p.foundation === '有编程基础' && c.id === 'python') {
        fit -= 12;
        risks.push('基础内容可能重复，建议先测评');
      }
      if (p.budgetAmount !== null) {
        if (p.budgetAmount >= c.price) {
          fit += 10;
          reasons.push(`学费 ${c.price} 元在预算 ${p.budgetAmount} 元内`);
        } else {
          fit -= Math.min(30, Math.round(((c.price - p.budgetAmount) / c.price) * 35));
          risks.push(`学费超预算 ${c.price - p.budgetAmount} 元，先确认可承受范围`);
        }
      } else risks.push('预算尚未确认，暂不建议直接催促付款');
      if (p.hoursPerWeek !== null) {
        if (p.hoursPerWeek >= c.hoursPerWeek) {
          fit += 8;
          reasons.push(`每周 ${p.hoursPerWeek} 小时可覆盖建议投入 ${c.hoursPerWeek} 小时`);
        } else {
          fit -= 25;
          risks.push(`每周可投入 ${p.hoursPerWeek} 小时，低于课程建议 ${c.hoursPerWeek} 小时`);
        }
      } else risks.push('学习时段和每周投入需确认');
      if (!reasons.length) reasons.push('仅作备选方向，需补充目标、预算与时间后再次评估');
      return { courseId: c.id, fit: Math.max(5, Math.min(98, fit)), reasons, risks };
    })
    .sort((a, b) => b.fit - a.fit);
}
export function analyzeDemo(
  transcript: string,
  courses: Course[],
  overrides: Partial<Profile> = {},
): Analysis {
  const t = studentText(transcript),
    p = { ...extractProfile(transcript), ...overrides };
  p.missing = (
    [
      ['预算', p.budgetAmount === null ? '待确认' : '已知'],
      ['每周可投入时间', p.hoursPerWeek === null ? '待确认' : '已知'],
      ['决策人', p.decisionMaker],
      ['职业', p.occupation],
      ['决策周期', p.decisionCycle],
    ] as const
  )
    .filter(([, v]) => v === '待确认')
    .map(([k]) => k);
  const ranked = matchCourses(p, courses);
  if (!ranked.length) throw new Error('请先启用至少一门课程');
  const best = courses.find((c) => c.id === ranked[0].courseId)!;
  const defs: [RegExp, string, string][] = [
    [
      /太贵|贵了|有点贵|超预算|价格高/,
      '价格异议',
      '先确认预算，再拆解课程内容与支持，避免未经授权的降价承诺。',
    ],
    [
      /没时间|没空|加班|时间不够/,
      '时间安排',
      '核对每周实际投入，必要时延期入学或选择负担更小的方案。',
    ],
    [/学不会|跟不上|零基础|没基础/, '基础顾虑', '先做基础测评，并邀请体验课程，不承诺人人学会。'],
    [/再考虑|想想|观望|先看看/, '决策观望', '确认仍缺少哪一项信息，并征得同意后约定下一次沟通。'],
    [/就业|找工作|工资|薪资|转行/, '就业信心', '说明能力目标与支持边界，不承诺保就业或具体薪资。'],
    [/效果|有没有用|有用吗|实用吗/, '效果疑问', '用课程大纲、作业要求与可核验案例说明学习路径。'],
    [/别家|比较|其他机构|竞品/, '竞品比较', '基于学习目标、课时、支持和费用提供客观比较清单。'],
    [/家人|父母|老公|老婆/, '家庭决策', '提供完整课程说明与费用信息，让共同决策人充分了解。'],
  ];
  const objections = defs
    .filter(([r]) => r.test(t))
    .map(([r, type, strategy]) => ({
      type,
      evidence:
        t
          .split(/[。！？\n]/)
          .find((x) => r.test(x))
          ?.trim() || type,
      strategy,
    }));
  const maxima = [20, 20, 15, 15, 10, 10, 10];
  const values = [
    p.goal.includes('待进一步') ? 6 : 18,
    Math.round((ranked[0].fit / 100) * 20),
    p.budgetAmount === null ? 6 : p.budgetAmount >= best.price ? 15 : 5,
    p.decisionCycle === '本周内' ? 15 : p.decisionCycle === '下周' ? 12 : 5,
    Math.min(10, 4 + (transcript.match(/学员[：:]/g)?.length || 1) * 2),
    objections.length > 2 ? 3 : objections.length ? 7 : 8,
    p.decisionMaker === '本人决定' ? 10 : p.decisionMaker === '需共同决策' ? 4 : 5,
  ];
  const reasons = [
    p.goal,
    `多维课程适配 ${ranked[0].fit}/100`,
    p.budget,
    p.decisionCycle,
    `本次记录中 ${transcript.match(/学员[：:]/g)?.length || 1} 次学员表达，仅基于提供的记录`,
    objections.length ? `${objections.length} 项顾虑待解决` : '尚未表达明确异议',
    p.decisionMaker,
  ];
  const invalid = /不需要|别联系|不要联系|号码错误|无效线索/.test(t);
  if (invalid) values.splice(0, 7, 1, 1, 1, 0, 1, 0, 0);
  const score = values.reduce((a, b) => a + b, 0),
    grade = gradeOf(score);
  const factors = factorNames.map((name, i) => ({
    name,
    value: values[i],
    max: maxima[i],
    reason: reasons[i],
  }));
  const canQuote = p.budgetAmount !== null && ranked[0].fit >= 65 && !invalid;
  const inviteTrial = ranked[0].fit >= 60 && !invalid;
  let reply = `了解到您希望${p.goal.replace(/^想/, '')}。结合目前基础，我建议先了解「${best.name}」：${best.weeks} 周，${best.format}，每周建议投入 ${best.hoursPerWeek} 小时。`;
  if (objections.some((o) => o.type === '价格异议'))
    reply += `您提到费用有压力，这点我理解。课程标准学费是 ${best.price} 元；我们可以先对照课程大纲，看看哪些内容真正符合您的目标，再决定是否值得投入。`;
  else if (objections.some((o) => o.type === '基础顾虑'))
    reply += '担心跟不上很正常，可以先做一个基础测评，看看学习起点是否合适。';
  else reply += '可以先看课程大纲和练习示例，确认内容是否符合您的预期。';
  reply += p.missing.includes('每周可投入时间')
    ? '您每周大约能留出多少时间学习？'
    : '如果您愿意，我可以先发课程资料，并协助确认试听安排。';
  if (invalid)
    reply = '已了解您的意愿，我们会停止后续招生跟进。如将来有学习需求，欢迎您主动联系我们。';
  const nextAction = invalid
    ? '停止营销跟进并标记流失'
    : ranked[0].fit < 60
      ? '补充确认目标、基础和学习时间，再决定课程方向'
      : objections.some((o) => o.type === '价格异议')
        ? '发送课程价值清单，确认预算与核心顾虑'
        : inviteTrial
          ? '发送课程方案，并邀约一次试听沟通'
          : '补充关键需求信息，完善学习方案';
  return analysisSchema.parse({
    summary: `${p.occupation}，关注${p.interest}；${p.concern}。${p.missing.length ? `还需确认${p.missing.slice(0, 2).join('、')}。` : ''}`,
    profile: p,
    stage: invalid
      ? '流失'
      : objections.length
        ? '异议处理'
        : ranked[0].fit >= 70
          ? '课程匹配'
          : '需求了解',
    matches: ranked.slice(0, 2),
    excluded: ranked
      .slice(-2)
      .filter((x) => !ranked.slice(0, 2).includes(x))
      .map((x) => ({
        courseId: x.courseId,
        reason: x.risks[0] || '与当前学习目标契合度较低，暂不优先推荐',
      })),
    score,
    grade,
    factors,
    objections,
    reply,
    materials: [`${best.name}课程大纲`, '学习投入与常见问题清单'],
    canQuote,
    inviteTrial,
    nextAction,
    followUp: invalid
      ? []
      : [
          {
            day: 0,
            title: '发送个性化课程方案',
            detail: `发送「${best.name}」大纲，说明匹配原因与学习投入，确认是否愿意继续沟通。`,
          },
          {
            day: 1,
            title: '确认核心顾虑',
            detail: `围绕「${p.concern}」沟通，补充${p.missing.join('、') || '试听反馈'}。`,
          },
          {
            day: 3,
            title: '分享练习示例与试听内容',
            detail: '只使用可核验的课程内容，确认试听意愿与可用时间，不承诺效果。',
          },
          {
            day: 7,
            title: '复盘学习计划与决策进展',
            detail: '确认课程、时间、费用是否匹配；如暂无计划，降低跟进频率。',
          },
        ],
    cautions: [
      '演示规则分析，人工确认后使用；意向评分不等于成交概率。',
      ...ranked[0].risks,
      ...(p.missing.length ? ['未明确的信息均为待确认，不能视为已知事实。'] : []),
    ],
    engine: 'demo',
    analyzedAt: new Date().toISOString(),
  });
}
