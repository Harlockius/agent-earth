import './globals.css';

export const metadata = {
  title: 'Oscar의 알파마 — 도시의 뼈를 읽다',
  description: 'AI가 리스본 알파마를 해부한다. 감각이 아닌 구조로 읽는 여행.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
