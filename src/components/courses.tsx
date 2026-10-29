'use client';
import { useState } from 'react';
import { BookOpen, Plus, PenLine, Clock3, Users, ArrowUpRight } from 'lucide-react';
import { useApp, PageHeading, Badge, Empty } from './shared';
import { Button } from './ui/button';
import { Modal } from './ui/dialog';
import { CourseInfo } from './leads';
import type { Course } from '@/lib/schema';
import { money } from '@/lib/utils';
const blankCourse = (): Course => ({
  id: crypto.randomUUID(),
  name: '',
  subtitle: '',
  audience: '',
  price: 1980,
  weeks: 6,
  hoursPerWeek: 4,
  format: '线上直播 + 助教答疑',
  goals: '',
  direction: '',
  prerequisites: '',
  tags: [],
  active: true,
  color: 'indigo',
  faq: [],
});
export function Courses() {
  const { data, mutate, toast } = useApp();
  const [edit, setEdit] = useState<Course | null>(null);
  const [view, setView] = useState<Course | null>(null);
  const [faq, setFaq] = useState('');
  const [filter, setFilter] = useState('全部课程');
  const [tags, setTags] = useState('');
  function open(c: Course) {
    setEdit(structuredClone(c));
    setFaq(c.faq.map((f) => f.question + '｜' + f.answer).join('\n'));
    setTags(c.tags.join('、'));
  }
  return (
    <div className="page">
      <PageHeading
        eyebrow="A GOOD MATCH STARTS WITH REAL INFORMATION"
        title="把课程讲清楚，让推荐更有底气"
        description="课程库是 AI 推荐的事实依据。价格、投入、适合人群，都来自这里。"
        action={
          <Button onClick={() => open(blankCourse())}>
            <Plus size={16} />
            新增课程
          </Button>
        }
      />
      <div className="catalog-toolbar">
        <div className="tabs">
          {['全部课程', '已启用', '已停用'].map((f) => (
            <button className={filter === f ? 'active' : ''} key={f} onClick={() => setFilter(f)}>
              {f}
            </button>
          ))}
        </div>
        <span>{data.courses.filter((c) => c.active).length} 门课程参与智能匹配</span>
      </div>
      <div className="catalog-grid">
        {data.courses
          .filter(
            (c) =>
              filter === '全部课程' ||
              (filter === '已启用' && c.active) ||
              (filter === '已停用' && !c.active),
          )
          .map((c) => (
            <div className="catalog-card" key={c.id}>
              <div className={`catalog-cover cover-${c.color}`}>
                <div className="catalog-graphic" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
                <span className="catalog-category">
                  ZHIYU ACADEMY <span> / </span>
                  {c.tags[0] || 'COURSE'}
                </span>
                <BookOpen size={38} strokeWidth={1.3} />
                <div>
                  {c.tags.map((t) => (
                    <span key={t}>{t}</span>
                  ))}
                </div>
              </div>
              <div className="catalog-body">
                <div className="catalog-name">
                  <h2>{c.name}</h2>
                  <Badge color={c.active ? 'teal' : 'slate'}>
                    {c.active ? '已启用' : '已停用'}
                  </Badge>
                </div>
                <p className="catalog-subtitle">{c.subtitle}</p>
                <div className="catalog-facts">
                  <span>
                    <Clock3 size={14} />
                    {c.weeks} 周 · 每周 {c.hoursPerWeek} 小时
                  </span>
                  <span>
                    <Users size={14} />
                    {c.format}
                  </span>
                </div>
                <p className="catalog-audience">{c.audience}</p>
                <div className="catalog-bottom">
                  <strong>{money(c.price)}</strong>
                  <div>
                    <button
                      className="icon-button"
                      aria-label={`编辑${c.name}`}
                      onClick={() => open(c)}
                    >
                      <PenLine size={16} />
                    </button>
                    <Button size="sm" variant="outline" onClick={() => setView(c)}>
                      课程详情
                      <ArrowUpRight size={13} />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
      </div>
      <div className="notice catalog-notice">
        <BookOpen size={18} />
        <p>
          修改课程信息后，重新分析相关咨询即可获得新的推荐。历史分析保留原始判断，避免改变顾问已使用的方案。
        </p>
      </div>
      <CourseInfo course={view} onClose={() => setView(null)} />
      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title={data.courses.some((c) => c.id === edit?.id) ? '维护课程信息' : '新增课程'}
        description="明确课程边界，不填写未经验证的就业、薪资或效果承诺。"
        wide
      >
        {edit && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const parsedFaq = faq
                .split('\n')
                .filter((x) => x.trim())
                .map((line) => {
                  const index = line.indexOf('｜') >= 0 ? line.indexOf('｜') : line.indexOf('|');
                  return {
                    question: index < 0 ? line : line.slice(0, index),
                    answer: index < 0 ? '待补充' : line.slice(index + 1),
                  };
                });
              if (
                await mutate({
                  type: 'course',
                  course: {
                    ...edit,
                    tags: tags
                      .split(/[、,，]/)
                      .map((t) => t.trim())
                      .filter(Boolean),
                    faq: parsedFaq,
                  },
                })
              ) {
                setEdit(null);
                toast('课程已保存，新分析将使用最新课程信息');
              }
            }}
          >
            <div className="form-grid">
              <label>
                课程名称
                <input
                  required
                  minLength={2}
                  maxLength={80}
                  value={edit.name}
                  onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                />
              </label>
              <label>
                课程简述
                <input
                  maxLength={160}
                  value={edit.subtitle}
                  onChange={(e) => setEdit({ ...edit, subtitle: e.target.value })}
                />
              </label>
              <label>
                价格（元）
                <input
                  type="number"
                  min={0}
                  max={1000000}
                  required
                  value={edit.price}
                  onChange={(e) => setEdit({ ...edit, price: Number(e.target.value) })}
                />
              </label>
              <label>
                周期（周）
                <input
                  type="number"
                  min={1}
                  max={104}
                  required
                  value={edit.weeks}
                  onChange={(e) => setEdit({ ...edit, weeks: Number(e.target.value) })}
                />
              </label>
              <label>
                每周建议投入（小时）
                <input
                  type="number"
                  min={1}
                  max={80}
                  required
                  value={edit.hoursPerWeek}
                  onChange={(e) => setEdit({ ...edit, hoursPerWeek: Number(e.target.value) })}
                />
              </label>
              <label>
                上课方式
                <input
                  required
                  minLength={2}
                  value={edit.format}
                  onChange={(e) => setEdit({ ...edit, format: e.target.value })}
                />
              </label>
              <label>
                适合人群
                <input
                  required
                  minLength={2}
                  value={edit.audience}
                  onChange={(e) => setEdit({ ...edit, audience: e.target.value })}
                />
              </label>
              <label>
                先修要求
                <input
                  value={edit.prerequisites}
                  onChange={(e) => setEdit({ ...edit, prerequisites: e.target.value })}
                />
              </label>
              <label>
                学习目标
                <textarea
                  required
                  minLength={2}
                  rows={3}
                  value={edit.goals}
                  onChange={(e) => setEdit({ ...edit, goals: e.target.value })}
                />
              </label>
              <label>
                能力 / 职业方向
                <textarea
                  rows={3}
                  value={edit.direction}
                  onChange={(e) => setEdit({ ...edit, direction: e.target.value })}
                />
              </label>
              <label>
                课程标签（顿号分隔）
                <input value={tags} onChange={(e) => setTags(e.target.value)} />
              </label>
              <label>
                是否参与推荐
                <select
                  value={edit.active ? 'yes' : 'no'}
                  onChange={(e) => setEdit({ ...edit, active: e.target.value === 'yes' })}
                >
                  <option value="yes">启用</option>
                  <option value="no">停用</option>
                </select>
              </label>
            </div>
            <label className="form-field">
              常见问题（每行：问题｜回答）
              <textarea
                rows={4}
                value={faq}
                onChange={(e) => setFaq(e.target.value)}
                placeholder="需要基础吗？｜无需技术基础，建议完成课前测评。"
              />
            </label>
            <div className="modal-footer">
              <Button type="submit">保存课程</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
