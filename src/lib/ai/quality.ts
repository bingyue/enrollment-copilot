import type { QualityInput, QualityReport } from '../schema';
export function reviewDemo(input: QualityInput): QualityReport {
  const items = input.conversations.map((c, i) => {
    const advisorLines = c.transcript
      .split('\n')
      .filter((x) => /^(老师|顾问|销售|招生老师)[：:]/.test(x.trim()));
    const advisor = advisorLines.join('\n');
    const student = c.transcript
      .split('\n')
      .filter((x) => !advisorLines.includes(x))
      .join('\n');
    const issues: { type: string; evidence: string; suggestion: string }[] = [];
    const strengths: string[] = [];
    const quote = (text: string, re: RegExp) => text.split('\n').find((l) => re.test(l)) || '';
    if (!advisorLines.length)
      issues.push({
        type: '记录角色不完整',
        evidence: '未发现「老师：」或「顾问：」标记的消息',
        suggestion: '补全角色标记后重新质检，当前无法评价老师话术。',
      });
    if (advisorLines.length && !/目标|基础|预算|希望|每周|想学|需求/.test(advisor))
      issues.push({
        type: '需求挖掘不足',
        evidence: advisorLines[0],
        suggestion: '先确认学习目标、当前基础和可投入时间，再推荐课程。',
      });
    const price = /贵|预算|便宜|价格|费用/;
    if (
      advisorLines.length &&
      price.test(student) &&
      !/理解|预算|目标|包含|大纲|投入|价值|承担/.test(advisor)
    )
      issues.push({
        type: '价格异议未解决',
        evidence: quote(student, price),
        suggestion: '接住费用顾虑，确认预算，并说明与学员目标相关的课程价值。',
      });
    const promise =
      /(?:保证|包|百分百|100%).{0,8}(?:就业|工作|学会|涨薪|收入|赚钱)|月薪.{0,3}\d+万|稳赚|肯定.{0,5}(?:就业|赚钱)/;
    const badLine = advisorLines.find(
      (x) => promise.test(x) && !/不保证|不包|不能保证|无法保证|不承诺/.test(x),
    );
    if (badLine)
      issues.push({
        type: '夸大或不当承诺',
        evidence: badLine,
        suggestion: '改为可验证的能力目标，明确不承诺就业、薪资或学习效果。',
      });
    if (
      advisorLines.length &&
      !/明天|下周|周[一二三四五六日]|今天.*点|约|方便.*时间|再联系|停止联系/.test(advisor)
    )
      issues.push({
        type: '缺少下一步约定',
        evidence: advisorLines.at(-1)!,
        suggestion: '征得同意后约定一个具体时间与下一步动作。',
      });
    if (/目标|基础|每周/.test(advisor)) strengths.push('先确认目标或学习条件');
    if (/理解|担心|您提到/.test(advisor)) strengths.push('回应学员情绪与顾虑');
    if (/大纲|试听|测评|练习/.test(advisor)) strengths.push('用具体资料或体验帮助判断');
    const score = !advisorLines.length
      ? 0
      : Math.max(12, 96 - issues.reduce((s, x) => s + (x.type === '夸大或不当承诺' ? 38 : 18), 0));
    return {
      id: `qi-${Date.now()}-${i}`,
      advisor: c.advisor,
      leadName: c.leadName,
      outcome: c.outcome,
      score,
      risk: score < 55 ? ('高' as const) : score < 80 ? ('中' as const) : ('低' as const),
      wasted:
        issues.length > 0 && /想|希望|报名|试听|预算|学习/.test(student) && c.outcome !== '已报名',
      issues,
      strengths,
      bestReply:
        '理解您对投入的顾虑。我们先把学习目标、每周时间和预算确认清楚，再对照课程大纲判断是否适合。您愿意先看一份大纲，并约个方便的时间聊一聊吗？',
      transcript: c.transcript,
    };
  });
  return {
    id: `qr-${crypto.randomUUID()}`,
    createdAt: new Date().toISOString(),
    engine: 'demo',
    items,
    summary: `已检查 ${items.length} 段对话，发现 ${items.filter((x) => x.wasted).length} 条有待挽回的咨询，${items.filter((x) => x.issues.some((i) => i.type === '价格异议未解决')).length} 段未充分回应价格异议。结论基于所提供的聊天片段。`,
  };
}
