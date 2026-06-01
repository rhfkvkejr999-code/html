'use client';

import { useEffect, useState } from 'react';
import DashboardCards from '@/components/DashboardCards';

type DashboardPayload = {
  cards: { title: string; value: string; sub: string; color: string }[];
  rows: string[][];
  error?: string;
};

export default function Home() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch(() => {
        setData({ cards: [], rows: [], error: '불러오기 실패' });
        setLoading(false);
      });
  }, []);

  if (loading) return <main style={{ padding: 24 }}>로딩 중...</main>;
  if (data?.error) return <main style={{ padding: 24 }}>오류: {data.error}</main>;

  return (
    <main style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 14, color: '#0f766e', fontWeight: 700, marginBottom: 8 }}>SURFHIRE</div>
        <h1 style={{ fontSize: 36, margin: 0 }}>사장용 대시보드</h1>
        <p style={{ color: '#6b7280', marginTop: 8 }}>프리랜서 현황과 급여를 한눈에 확인하세요.</p>
      </div>

      <DashboardCards cards={data?.cards || []} />

      <section style={{ marginTop: 28, background: 'white', borderRadius: 18, border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 10px 24px rgba(15, 23, 42, 0.06)' }}>
        <div style={{ padding: 18, borderBottom: '1px solid #eef2f7', fontWeight: 700 }}>샵별 급여 현황</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb', textAlign: 'left' }}>
              <th style={{ padding: 14 }}>shop_id</th>
              <th style={{ padding: 14 }}>샵명</th>
              <th style={{ padding: 14 }}>배정건수</th>
              <th style={{ padding: 14 }}>총급여</th>
              <th style={{ padding: 14 }}>미지급금액</th>
            </tr>
          </thead>
          <tbody>
            {(data?.rows || []).map((row, idx) => (
              <tr key={idx} style={{ borderTop: '1px solid #eef2f7' }}>
                <td style={{ padding: 14 }}>{row[0] || '-'}</td>
                <td style={{ padding: 14 }}>{row[1] || '-'}</td>
                <td style={{ padding: 14 }}>{row[2] || '-'}</td>
                <td style={{ padding: 14 }}>{row[3] || '-'}</td>
                <td style={{ padding: 14 }}>{row[4] || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
