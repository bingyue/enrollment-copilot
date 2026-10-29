import { z } from 'zod';

export const stages = [
  '新线索',
  '需求了解',
  '课程匹配',
  '价值建立',
  '异议处理',
  '报价',
  '待决策',
  '已报名',
  '流失',
] as const;
export const taskStatuses = ['待跟进', '已联系', '待回复', '已报名', '流失'] as const;
export const sources = ['微信', '企业微信', '网页咨询', '活动表单', '转介绍'] as const;
export const courseSchema = z.object({
  id: z.string(),
  name: z.string().min(2).max(80),
  subtitle: z.string().max(160),
  audience: z.string().min(2).max(500),
  price: z.number().min(0).max(1000000),
  weeks: z.number().int().min(1).max(104),
  hoursPerWeek: z.number().min(1).max(80),
  format: z.string().min(2).max(200),
  goals: z.string().min(2).max(1000),
  direction: z.string().max(300),
  prerequisites: z.string().max(500),
  tags: z.array(z.string()).max(10),
  active: z.boolean(),
  faq: z.array(z.object({ question: z.string(), answer: z.string() })).max(20),
  color: z.string(),
});
export type Course = z.infer<typeof courseSchema>;
export const profileSchema = z.object({
  identity: z.string(),
  age: z.string(),
  occupation: z.string(),
  foundation: z.string(),
  goal: z.string(),
  budget: z.string(),
  budgetAmount: z.number().nullable(),
  availability: z.string(),
  hoursPerWeek: z.number().nullable(),
  interest: z.string(),
  concern: z.string(),
  decisionCycle: z.string(),
  decisionMaker: z.string(),
  missing: z.array(z.string()),
});
export const factorNames = [
  '需求明确度',
  '课程匹配度',
  '预算适配',
  '时间紧迫度',
  '互动频率',
  '异议可解度',
  '决策权限',
] as const;
export const analysisSchema = z.object({
  summary: z.string(),
  profile: profileSchema,
  stage: z.enum(stages),
  matches: z
    .array(
      z.object({
        courseId: z.string(),
        fit: z.number().min(0).max(100),
        reasons: z.array(z.string()).min(1),
        risks: z.array(z.string()),
      }),
    )
    .min(1)
    .max(3),
  excluded: z.array(z.object({ courseId: z.string(), reason: z.string() })),
  score: z.number().int().min(0).max(100),
  grade: z.enum(['A', 'B', 'C', 'D']),
  factors: z
    .array(
      z.object({
        name: z.enum(factorNames),
        value: z.number().min(0),
        max: z.number().positive(),
        reason: z.string(),
      }),
    )
    .length(7),
  objections: z.array(z.object({ type: z.string(), evidence: z.string(), strategy: z.string() })),
  reply: z.string(),
  materials: z.array(z.string()),
  canQuote: z.boolean(),
  inviteTrial: z.boolean(),
  nextAction: z.string(),
  followUp: z
    .array(z.object({ day: z.number().int().min(0).max(7), title: z.string(), detail: z.string() }))
    .min(0)
    .max(8),
  cautions: z.array(z.string()),
  engine: z.enum(['demo', 'live']),
  analyzedAt: z.string(),
});
export type Analysis = z.infer<typeof analysisSchema>;
export type Profile = z.infer<typeof profileSchema>;
export const messageSchema = z.object({
  id: z.string(),
  role: z.enum(['student', 'advisor', 'system']),
  content: z.string(),
  at: z.string(),
});
export const leadSchema = z.object({
  id: z.string(),
  name: z.string(),
  source: z.string(),
  owner: z.string(),
  stage: z.enum(stages),
  createdAt: z.string(),
  updatedAt: z.string(),
  enrolledAt: z.string().nullable(),
  lostReason: z.string(),
  analysis: analysisSchema,
  profileOverrides: profileSchema.partial().optional(),
  messages: z.array(messageSchema),
  notes: z.string(),
});
export type Lead = z.infer<typeof leadSchema>;
export const taskSchema = z.object({
  id: z.string(),
  leadId: z.string(),
  title: z.string(),
  detail: z.string(),
  due: z.string(),
  status: z.enum(taskStatuses),
  done: z.boolean(),
  kind: z.enum(['sales', 'operation']),
  planDay: z.number().int().min(0).max(7).optional(),
  manual: z.boolean().optional(),
  createdAt: z.string(),
});
export type Task = z.infer<typeof taskSchema>;
export const studentSchema = z.object({
  id: z.string(),
  leadId: z.string(),
  courseId: z.string(),
  enrolledAt: z.string(),
  startsAt: z.string(),
  progress: z.number().min(0).max(100),
  homework: z.number().min(0).max(100),
  activity: z.number().min(0).max(100),
  lastActive: z.string(),
  note: z.string(),
  renewal: z.enum(['待评估', '可推荐进阶', '已续费']),
  referral: z.enum(['待培育', '可邀约', '已转介绍']),
});
export type Student = z.infer<typeof studentSchema>;
export const qualityItemSchema = z.object({
  id: z.string(),
  advisor: z.string(),
  leadName: z.string(),
  outcome: z.enum(['未知', '已报名', '未报名']),
  score: z.number().min(0).max(100),
  risk: z.enum(['高', '中', '低']),
  wasted: z.boolean(),
  issues: z.array(z.object({ type: z.string(), evidence: z.string(), suggestion: z.string() })),
  strengths: z.array(z.string()),
  bestReply: z.string(),
  transcript: z.string(),
});
export type QualityItem = z.infer<typeof qualityItemSchema>;
export const qualityReportSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  engine: z.enum(['demo', 'live']),
  items: z.array(qualityItemSchema),
  summary: z.string(),
});
export type QualityReport = z.infer<typeof qualityReportSchema>;
export const workspaceSchema = z.object({
  version: z.number().int(),
  leads: z.array(leadSchema),
  courses: z.array(courseSchema),
  tasks: z.array(taskSchema),
  students: z.array(studentSchema),
  reports: z.array(qualityReportSchema),
});
export type Workspace = z.infer<typeof workspaceSchema>;
export const analyzeInput = z.object({
  transcript: z.string().trim().min(12, '请至少输入 12 个字的咨询内容').max(16000),
  name: z.string().trim().min(1).max(40),
  source: z.enum(sources),
  owner: z.string().trim().min(1).max(40),
  leadId: z.string().optional(),
});
export const qualityInput = z.object({
  conversations: z
    .array(
      z.object({
        advisor: z.string().min(1).max(40),
        leadName: z.string().min(1).max(40),
        outcome: z.enum(['未知', '已报名', '未报名']).default('未知'),
        transcript: z.string().min(12).max(12000),
      }),
    )
    .min(1)
    .max(20),
});
export type QualityInput = z.infer<typeof qualityInput>;
export const actionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('task'),
    id: z.string(),
    status: z.enum(taskStatuses),
    done: z.boolean(),
  }),
  z.object({
    type: z.literal('lead'),
    id: z.string(),
    name: z.string().min(1).max(40),
    owner: z.string().min(1).max(40),
    notes: z.string().max(2000),
    stage: z.enum(stages),
    lostReason: z.string().max(200),
  }),
  z.object({
    type: z.literal('profile'),
    id: z.string(),
    profile: profileSchema,
    reply: z.string().max(3000),
    score: z.number().int().min(0).max(100),
  }),
  z.object({
    type: z.literal('message'),
    id: z.string(),
    role: z.enum(['student', 'advisor']),
    content: z.string().trim().min(1).max(8000),
  }),
  z.object({ type: z.literal('enroll'), id: z.string(), courseId: z.string() }),
  z.object({ type: z.literal('plan'), id: z.string() }),
  z.object({
    type: z.literal('editTask'),
    id: z.string(),
    title: z.string().min(1).max(200),
    detail: z.string().max(1000),
    due: z.string().datetime(),
  }),
  z.object({
    type: z.literal('student'),
    id: z.string(),
    startsAt: z.string().datetime(),
    progress: z.number().min(0).max(100),
    homework: z.number().min(0).max(100),
    activity: z.number().min(0).max(100),
    note: z.string().max(1000),
    renewal: z.enum(['待评估', '可推荐进阶', '已续费']),
    referral: z.enum(['待培育', '可邀约', '已转介绍']),
  }),
  z.object({
    type: z.literal('operationTask'),
    id: z.string(),
    title: z.string().min(1).max(200),
    detail: z.string().max(1000),
  }),
  z.object({ type: z.literal('course'), course: courseSchema }),
  z.object({ type: z.literal('reset'), confirm: z.literal('RESET_DEMO') }),
]);
export type Action = z.infer<typeof actionSchema>;
