import { useEffect, useMemo, useState } from 'react';
import { fetchApplications, fetchRecruitmentStatus } from '../../services/applicationService';
import { getApplications } from '../../mocks/applicationsStore';
import { getRecruitmentStatus } from '../../mocks/recruitmentStore';
import { isSupabaseConfigured } from '../../services/supabaseClient';
import { REGISTRATION_METHOD_LABELS, STATUS_LABELS, formatWon } from '../../utils/adminStatus';
import { calculateDesiredRatio } from '../../utils/price';
import type { Application, RecruitmentStatus } from '../../types';

function countBy(
  applications: Application[],
  labelOf: (application: Application) => string,
) {
  const counts: Record<string, number> = {};
  for (const a of applications) {
    const label = labelOf(a);
    counts[label] = (counts[label] ?? 0) + 1;
  }
  return Object.entries(counts).sort(([a], [b]) =>
    a.localeCompare(b, 'ko', { numeric: true }),
  );
}

function priceBuckets(applications: Application[]) {
  return countBy(applications, (a) => formatWon(a.desiredPrice));
}

function ratioBuckets(applications: Application[]) {
  return countBy(applications, (a) => `${calculateDesiredRatio(a.unitBasePrice, a.desiredPrice)}%`);
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
  const paidSales = useMemo(
    () => applications.filter((a) => a.desiredPrice > 0).length,
    [applications],
  );
  const freeTransfers = useMemo(
    () => applications.filter((a) => a.desiredPrice === 0).length,
    [applications],
  );
  const completed = useMemo(() => applications.filter((a) => a.status === 'COMPLETED').length, [applications]);

  const priceDist = useMemo(() => priceBuckets(applications), [applications]);
  const ratioDist = useMemo(() => ratioBuckets(applications), [applications]);
  const registrationMethodDist = useMemo(
    () => countBy(applications, (a) => REGISTRATION_METHOD_LABELS[a.registrationMethod]),
    [applications],
  );
  const storeDist = useMemo(() => countBy(applications, (a) => a.store), [applications]);
  const promotionDist = useMemo(
    () => countBy(applications, (a) => a.promotionType),
    [applications],
  );
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
          <dt>무상 양도(0원)</dt>
          <dd>{freeTransfers}</dd>
        </div>
        <div className="metric-card">
          <dt>거래 완료</dt>
          <dd>{completed}</dd>
        </div>
      </div>

      <div className="metrics-tables">
        <section className="detail-card">
          <h2 className="detail-section-title">판매 희망금액 분포</h2>
          {priceDist.length === 0 ? (
            <p className="admin-empty-card">데이터가 없어요.</p>
          ) : (
            <table className="applications-table">
              <thead>
                <tr>
                  <th scope="col">판매 희망금액</th>
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
          <h2 className="detail-section-title">등록 방식별 신청 수</h2>
          <table className="applications-table">
            <thead>
              <tr>
                <th scope="col">등록 방식</th>
                <th scope="col">신청 수</th>
              </tr>
            </thead>
            <tbody>
              {registrationMethodDist.map(([method, count]: [string, number]) => (
                <tr key={method}>
                  <td>{method}</td>
                  <td>{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="detail-card">
          <h2 className="detail-section-title">희망가격 비율 분포 (분석용)</h2>
          {ratioDist.length === 0 ? (
            <p className="admin-empty-card">데이터가 없어요.</p>
          ) : (
            <table className="applications-table">
              <thead>
                <tr>
                  <th scope="col">희망가격 비율</th>
                  <th scope="col">신청 수</th>
                </tr>
              </thead>
              <tbody>
                {ratioDist.map(([ratio, count]: [string, number]) => (
                  <tr key={ratio}>
                    <td>{ratio}</td>
                    <td>{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="detail-card">
          <h2 className="detail-section-title">편의점별 신청 수</h2>
          <table className="applications-table">
            <thead>
              <tr>
                <th scope="col">편의점</th>
                <th scope="col">신청 수</th>
              </tr>
            </thead>
            <tbody>
              {storeDist.map(([store, count]: [string, number]) => (
                <tr key={store}>
                  <td>{store}</td>
                  <td>{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="detail-card">
          <h2 className="detail-section-title">행사 유형별 신청 수</h2>
          <table className="applications-table">
            <thead>
              <tr>
                <th scope="col">행사 유형</th>
                <th scope="col">신청 수</th>
              </tr>
            </thead>
            <tbody>
              {promotionDist.map(([promotion, count]: [string, number]) => (
                <tr key={promotion}>
                  <td>{promotion}</td>
                  <td>{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
