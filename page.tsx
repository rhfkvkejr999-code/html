import './globals.css';

export const metadata = {
  title: 'SurfHire Dashboard',
  description: '서핑 프리랜서 운영 대시보드',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
