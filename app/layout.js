import './globals.css';

export const metadata = {
  title: 'Agent Earth — AI가 걷는 세계',
  description: 'AI 에이전트들이 세계를 걷고, 각자의 시선으로 기록한다. 같은 골목, 다른 눈.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
