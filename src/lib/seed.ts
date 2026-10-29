import { defaultCourses } from './catalog';
import { analyzeDemo } from './ai/demo';
import { reviewDemo } from './ai/quality';
import { addDays, gradeOf, dateKey } from './utils';
import type { Workspace, Lead, Task, Student } from './schema';
export const demoConsultation =
  '学员：你好，我叫林悦，今年28岁，目前是产品经理，有3年工作经验。想学习 AI 产品设计，完成一个自己的产品项目。\n学员：我不会编程，每周能投入6小时，预算5000元，希望这周开始，自己决定就好。\n老师：了解，你目前最担心的是什么？\n学员：之前看过一些课，感觉有点贵，也担心零基础跟不上。可以先试听吗？';
export const qaSample = {
  conversations: [
    {
      advisor: '陈老师',
      leadName: '李雯',
      outcome: '未报名' as const,
      transcript:
        '学员：想学 AI 产品经理，我做运营，预算5000，每周能学习6小时。\n老师：课程4980元，现在可以报名。\n学员：有点贵，我担心不适合。\n老师：都是这个价，您考虑好了再找我。',
    },
    {
      advisor: '周老师',
      leadName: '吴子轩',
      outcome: '未知' as const,
      transcript:
        '学员：零基础想转行，学完能找到工作吗？\n老师：我们保证就业，学完月薪3万。\n学员：真的吗？那我想了解一下。\n老师：现在直接付款就行。',
    },
    {
      advisor: '林老师',
      leadName: '周晓',
      outcome: '已报名' as const,
      transcript:
        '学员：我做产品，想学AI应用设计，每周能投入6小时，预算5000元。\n老师：了解您的目标和基础。AI产品经理课程大纲里有原型和效果评估，学费4980元。\n学员：有点担心效果。\n老师：理解您的顾虑，我们不保证转岗，先看大纲和练习要求，您愿意明天下午3点聊试听安排吗？\n学员：可以的。',
    },
    {
      advisor: '林老师',
      leadName: '赵雨晴',
      outcome: '已报名' as const,
      transcript:
        '学员：我想用Python做报表自动化，零基础，预算2000。\n老师：您每周能投入多少时间？\n学员：4小时，主要晚上。\n老师：可以先做入门测评，课程大纲覆盖您需要的基础。我们明天18点聊下练习体验，方便吗？\n学员：好的。',
    },
  ],
};
export function makeSeed(): Workspace {
  const now = new Date();
  const courses = structuredClone(defaultCourses);
  const names = [
    '林悦',
    '张子涵',
    '陈一诺',
    '王浩然',
    '李思雨',
    '周佳宁',
    '赵雨晴',
    '刘子轩',
    '沈可欣',
    '许言',
    '何明远',
    '吴悠',
    '徐佳琪',
    '杨帆',
    '孙悦',
    '郑嘉',
    '方晨',
    '顾北',
    '蒋依依',
    '梁星',
    '丁沐',
    '黄可',
    '程诺',
    '罗宁',
    '宋知远',
    '马欣',
    '苏然',
    '叶泽',
    '唐语',
    '陆天',
    '彭雨',
    '夏青',
    '钟念',
    '谢安',
    '邹文',
    '余新',
    '韩希',
    '董晓',
    '白羽',
    '田恬',
    '袁昕',
    '蔡晓',
    '潘越',
    '杜若',
    '魏宇',
    '秦月',
    '金予',
    '孟夏',
    '江望',
    '邵可',
  ];
  const templates = [
    demoConsultation,
    '学员：我做后端开发，会Python，有3年编程经验，想学习FDE和AI项目交付。每周可以投入10小时，预算8000元，希望这周报名，自己决定。能约试听吗？',
    '学员：我是电商运营，想系统学习店铺选品和投放。预算3500元，每周能学5小时，下周可以开始。我自己决定。',
    '学员：我是行政，28岁，想学Python实现报表自动化，零基础。预算2000元，每周能投入4小时，希望这周开始，自己决定。',
    '学员：我做新媒体运营，想学习短视频和内容策划，预算3000元，每周能投入5小时，希望下周学。家人需要商量，有点担心课程效果。',
    '学员：想学AI产品经理，我有运营经验，预算3000元，每周只有3小时，课程有点贵，最近经常加班没时间。',
    '学员：我是开发，想学FDE和Agent，有编程基础，预算6000元，每周8小时。我还在和其他机构比较，想再考虑一下。',
    '学员：想了解Python，零基础，先看看不着急，还没确定学习计划。',
    '学员：我是电商店主，想学店铺经营，预算2000元，每周2小时，家人不同意，我也担心就业和效果。',
    '学员：想学新媒体短视频，但现在不需要了，请不要联系。',
  ];
  const leads: Lead[] = names.map((name, i) => {
    const transcript =
      i === 0
        ? demoConsultation
        : i >= 38 && i <= 44
          ? templates[[2, 3, 0, 1, 2, 0, 4][i - 38]]
          : templates[i % templates.length];
    const a = analyzeDemo(transcript, courses);
    // Demo history covers all stages; imported consultations always use the actual scoring engine.
    if (i > 7 && i < 38 && a.score >= 80) {
      const target = 65 + (i % 12);
      const delta = a.score - target;
      let left = delta;
      for (const f of a.factors) {
        const take = Math.min(f.value - 1, Math.max(0, left));
        f.value -= take;
        left -= take;
      }
      a.score = a.factors.reduce((sum, f) => sum + f.value, 0);
      a.grade = gradeOf(a.score);
      a.factors[0].reason += '；演示历史中需求尚未完整确认';
    }
    const createdAt =
      i < 38
        ? new Date(`${dateKey(now)}T08:${String(10 + i).padStart(2, '0')}:00+08:00`).toISOString()
        : addDays(now, -(4 + (i % 12)));
    let stage = a.stage;
    if (i >= 38 && i <= 44) stage = '已报名';
    else if (i >= 45) stage = '流失';
    else if (i % 10 === 1) stage = '待决策';
    else if (i % 10 === 2) stage = '报价';
    else if (i % 10 === 3) stage = '价值建立';
    else if (i % 10 === 7) stage = '新线索';
    return {
      id: `lead-${i + 1}`,
      name,
      source: ['微信', '企业微信', '网页咨询', '活动表单', '转介绍'][i % 5],
      owner: ['林老师', '陈老师', '周老师'][i % 3],
      stage,
      createdAt,
      updatedAt: addDays(createdAt, 0.01),
      enrolledAt: stage === '已报名' ? addDays(now, -((i % 4) + 1)) : null,
      lostReason:
        stage === '流失'
          ? ['预算不匹配', '时间安排冲突', '选择其他机构', '暂无学习计划', '停止联系'][i % 5]
          : '',
      analysis: { ...a, stage },
      messages: [
        {
          id: `m-${i}-1`,
          role: 'student',
          content: transcript.replace(/林悦/g, name),
          at: createdAt,
        },
        {
          id: `m-${i}-2`,
          role: 'advisor',
          content:
            i === 0
              ? '林悦你好，我是林老师。你提到的目标和时间安排很清楚，我先帮你对照课程内容，看看适不适合。'
              : a.reply,
          at: addDays(createdAt, 0.01),
        },
      ],
      notes: i === 0 ? '希望做出一个可以展示的 AI 产品，优先关注项目实践与学习时间。' : '',
    };
  });
  const tasks: Task[] = leads
    .filter((l) => !['已报名', '流失'].includes(l.stage))
    .flatMap((l, i) =>
      l.analysis.followUp.slice(0, 2).map((p, j) => ({
        id: `task-${l.id}-${j}`,
        leadId: l.id,
        title: p.title,
        detail: p.detail,
        due: addDays(now, j === 0 ? (i < 6 ? 0 : 1 + (i % 3)) : 3),
        status: '待跟进' as const,
        done: false,
        kind: 'sales' as const,
        planDay: p.day,
        createdAt: now.toISOString(),
      })),
    );
  const students: Student[] = leads
    .filter((l) => l.stage === '已报名')
    .map((l, i) => ({
      id: `student-${l.id}`,
      leadId: l.id,
      courseId: l.analysis.matches[0].courseId,
      enrolledAt: l.enrolledAt!,
      startsAt: addDays(now, -(i * 7)),
      progress: [12, 78, 42, 8, 96, 65, 30][i],
      homework: [20, 90, 40, 0, 100, 80, 20][i],
      activity: [25, 92, 55, 18, 95, 75, 38][i],
      lastActive: addDays(now, -[5, 0, 2, 8, 0, 1, 4][i]),
      note: i === 0 ? '近期加班较多，安排一次学习节奏沟通。' : '',
      renewal: i === 4 ? '可推荐进阶' : '待评估',
      referral: i === 4 ? '可邀约' : '待培育',
    }));
  return { version: 1, leads, courses, tasks, students, reports: [reviewDemo(qaSample)] };
}
