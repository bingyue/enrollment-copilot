import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: '知遇 · AI 招生与学员运营工作台',
  description: '从第一句咨询到持续成长，知遇帮助招生顾问理解学员、匹配课程、跟进转化与学员运营。',
  icons: { icon: '/icon.svg' },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
