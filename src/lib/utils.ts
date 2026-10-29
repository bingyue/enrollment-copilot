import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export const money = (n: number) =>
  new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    maximumFractionDigits: 0,
  }).format(n);
export const dateKey = (date: Date | string = new Date()) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(date));
export const addDays = (date: Date | string, n: number) =>
  new Date(new Date(date).getTime() + n * 86400000).toISOString();
export const dayLabel = (date: string) => {
  const d = dateKey(date),
    today = dateKey();
  return d === today
    ? '今天'
    : d === dateKey(addDays(new Date(), 1))
      ? '明天'
      : new Date(date).toLocaleDateString('zh-CN', {
          timeZone: 'Asia/Shanghai',
          month: '2-digit',
          day: '2-digit',
        });
};
export const timeLabel = (date: string) =>
  new Date(date).toLocaleTimeString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    hour: '2-digit',
    minute: '2-digit',
  });
export const gradeOf = (score: number): 'A' | 'B' | 'C' | 'D' =>
  score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 35 ? 'C' : 'D';
export function csvCell(value: unknown) {
  let s = String(value ?? '');
  if (/^[=+@\-\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replaceAll('"', '""') + '"';
}
