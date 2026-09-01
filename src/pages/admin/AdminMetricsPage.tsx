import { useEffect, useMemo, useState } from 'react';
import { fetchApplications, fetchRecruitmentStatus } from '../../services/applicationService';
import { getApplications } from '../../mocks/applicationsStore';
import { getRecruitmentStatus } from '../../mocks/recruitmentStore';
import { isSupabaseConfigured } from '../../services/supabaseClient';
import { STATUS_LABELS, formatWon } from '../../utils/adminStatus';
import type { Application, RecruitmentStatus } from '../../types';

function priceBuckets(applications: Application[]) {
  const counts: Record<string, number> = {};
  for (const a of applications) {
    const label = formatWon(a.finalPrice);
    counts[label] = (counts[label] ?? 0) + 1;
  }
  return Object.entries(counts).sort(([a], [b]) =>
    a.localeCompare(b, 'ko', { numeric: true }),
  );
}

function statusCounts(applications: Application[]) {
  const counts: Record<string, number> = {};
  for (const a of applications) {
    const label = STATUS_LABELS[a.status];
    counts[label] = (counts[label] ?? 0) + 1;
  }
  return Object.entries(counts);
}

export const AdminMetricsPage: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>(() =>
    isSupabaseConfigured ? [] : getApplications(),
  );
  const [recStatus, setRecStatus] = useState<RecruitmentStatus | null>(() =>
    isSupabaseConfigured ? null : getRecruitmentStatus(),
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchApplications()
      .then((data) => {
        if (active) setApplications(data);
      })
      .catch(() => {
        if (active) setError('지표를 불러오지 못했어요.');
      });
    fetchRecruitmentStatus()
      .then((status) => {
        if (active) setRecStatus(status);
      })
      .catch(() => {
        if (active) setError('모집 상태를 불러오지 못했어요.');
      });
    return () => {
      active = false;
    };
  }, []);

  const total = applications.length;
  const paidSales = useMemo(() => applications.filter((a) => a.finalPrice > 0).length, [applications]);
  const freeTransfers = useMemo(() => applications.filter((a) => a.finalPrice === 0).length, [applications]);
  const priceOfferCount = useMemo(() => applications.filter((a) => a.hadPriceOffer).length, [applications]);
  const offerAcceptedCount = useMemo(
    () => applications.filter((a) => a.hadPriceOffer && a.offerAccepted).length,
    [applications],
  );
  const completed = useMemo(() => applications.filter((a) => a.status === 'COMPLETED').length, [applications]);

  const offerAcceptRate =
    priceOfferCount === 0 ? 0 : Math.round((offerAcceptedCount / priceOfferCount) * 100);

  const priceDist = useMemo(() => priceBuckets(applications), [applications]);
  const statusDist = useMemo(() => statusCounts(applications), [applications]);

  return (
    <div className="admin-metrics-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">실험 현황</h1>
        <p className="admin-page-subtitle">
          현재 모집 상태:{' '}
          {recStatus ? (
            <strong className={`recruitment-badge recruitment-badge-${recStatus.toLowerCase()}`}>
              {recStatus}
            </strong>
          ) : (
            <strong>확인 중</strong>
          )}
        </p>
      </div>

      {error && <div className="status-notice status-notice-closed" role="alert">{error}</div>}

      <div className="metric-cards">
        <div className="metric-card">
          <dt>전체 신청 수</dt>
          <dd>{total}</dd>
        </div>
        <div className="metric-card">
          <dt>유상 판매 의향</dt>
          <dd>{paidSales}</dd>
        </div>
        <div className="metric-card">
          <dt>무상 양도(0%)</dt>
          <dd>{freeTransfers}</dd>
        </div>
        <div className="metric-card">
          <dt>가격 제안 횟수</dt>
          <dd>{priceOfferCount}</dd>
        </div>
        <div className="metric-card">
          <dt>제안 수락률</dt>
          <dd>{offerAcceptRate}%</dd>
        </div>
        <div className="metric-card">
          <dt>거래 완료</dt>
          <dd>{completed}</dd>
        </div>
      </div>

      <div className="metrics-tables">
        <section className="detail-card">
          <h2 className="detail-section-title">최종 가격 분포</h2>
          {priceDist.length === 0 ? (
            <p className="admin-empty-card">데이터가 없어요.</p>
          ) : (
            <table className="applications-table">
              <thead>
                <tr>
                  <th scope="col">최종 가격</th>
                  <th scope="col">신청 수</th>
                </tr>
              </thead>
              <tbody>
                {priceDist.map(([price, count]: [string, number]) => (
                  <tr key={price}>
                    <td>{price}</td>
                    <td>{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="detail-card">
          <h2 className="detail-section-title">상태별 신청 수</h2>
          <table className="applications-table">
            <thead>
              <tr>
                <th scope="col">상태</th>
                <th scope="col">신청 수</th>
              </tr>
            </thead>
            <tbody>
              {statusDist.map(([label, count]: [string, number]) => (
                <tr key={label}>
                  <td>{label}</td>
                  <td>{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
};
