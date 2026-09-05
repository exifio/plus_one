import { useEffect, useState } from 'react';
import { useServer } from '../../server/ServerContext';
import { getRecruitmentStatusInfo } from '../../recruitment/domain/recruitmentStatus';
import AdminNav from '../components/AdminNav';

// UI Label은 DESIGN §19 상태 Badge 기준을 따른다.
const STORE_LABELS = { gs25: 'GS25', cu: 'CU' };
const PROMOTION_LABELS = { one_plus_one: '1+1', two_plus_one: '2+1' };
const REQUEST_STATUS_LABELS = { received: '접수됨', contacting: '연락중', completed: '처리완료' };
const ITEM_RESULT_LABELS = { pending: '미처리', purchased: '구매', rejected: '거절' };

const RATIO_BUCKETS = [
  ['lte_25', '25% 이하'],
  ['mid_26_50', '26~50%'],
  ['mid_51_75', '51~75%'],
  ['mid_76_100', '76~100%'],
  ['gt_100', '100% 초과'],
];

const EMPTY_DISTRIBUTION_MESSAGE = '데이터가 없어요.';

function CountTable({ rows }) {
  return (
    <table className="experiment-table">
      <tbody>
        {rows.map(([label, value]) => (
          <tr key={label}>
            <th scope="row">{label}</th>
            <td>{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * Admin 실험 현황 화면. (PRD §13, DESIGN §17)
 *
 * 범용 Dashboard가 아니라 핵심 가설 검증용 read-only 운영 화면이다.
 * 집계는 adapter(API contract getExperimentMetrics)가 담당하며
 * 이 컴포넌트는 표시만 한다. Chart library / fake 증가율 없음.
 */
export default function AdminExperimentPage() {
  const { adminApi } = useServer();
  const [metrics, setMetrics] = useState(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    adminApi
      .getExperimentMetrics()
      .then((data) => {
        if (!cancelled) setMetrics(data);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [adminApi]);

  const recruitmentInfo = getRecruitmentStatusInfo(metrics?.recruitmentStatus);

  if (loadError) {
    return (
      <div className="admin-page">
        <header className="admin-header">
          <span className="brand-logo">
            <span className="brand-logo-plus">+</span>
            <span className="brand-logo-num">1</span>
            <span className="brand-logo-suffix">관리자 페이지</span>
          </span>
          <AdminNav />
        </header>
        <main className="admin-main">
          <h1 className="admin-title">실험 현황</h1>
          <p className="admin-empty">
            실험 현황을 불러오지 못했어요. 잠시 후 다시 시도해주세요.
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <span className="brand-logo">
          <span className="brand-logo-plus">+</span>
          <span className="brand-logo-num">1</span>
          <span className="brand-logo-suffix">관리자 페이지</span>
        </span>
        <AdminNav />
      </header>

      <main className="admin-main">
        <h1 className="admin-title">실험 현황</h1>
        <div
          className="recruitment-status-row experiment-recruitment-row"
          data-testid="experiment-recruitment-status"
        >
          <span className="experiment-recruitment-label">현재 모집 상태</span>
          <span className={`status-badge ${recruitmentInfo.badgeClass}`}>
            {recruitmentInfo.label}
          </span>
        </div>

        {metrics === null ? (
          <p className="admin-loading">불러오는 중…</p>
        ) : (
          <>
            <section
              className="experiment-summary"
              data-testid="experiment-summary"
              aria-label="핵심 요약"
            >
              <div className="experiment-summary-card">
                <span className="experiment-summary-value">{metrics.totalSaleRequests}</span>
                <span className="experiment-summary-label">전체 판매 신청 수</span>
              </div>
              <div className="experiment-summary-card">
                <span className="experiment-summary-value">{metrics.uniqueSellers}</span>
                <span className="experiment-summary-label">고유 판매자 수</span>
              </div>
              <div className="experiment-summary-card">
                <span className="experiment-summary-value">{metrics.purchasedItems}</span>
                <span className="experiment-summary-label">실제 구매 상품 수</span>
              </div>
              <div className="experiment-summary-card">
                <span className="experiment-summary-value">{metrics.completedSaleRequests}</span>
                <span className="experiment-summary-label">처리 완료 신청 수</span>
              </div>
            </section>

            <section className="experiment-analysis" aria-label="분석">
              <div className="experiment-card">
                <h2 className="experiment-card-title">판매 희망금액 분포</h2>
                {metrics.askingPriceDistribution.length === 0 ? (
                  <p className="experiment-empty">{EMPTY_DISTRIBUTION_MESSAGE}</p>
                ) : (
                  <CountTable
                    rows={metrics.askingPriceDistribution.map(({ price, count }) => [
                      `${price.toLocaleString('ko-KR')}원`,
                      count,
                    ])}
                  />
                )}
              </div>

              <div className="experiment-card">
                <h2 className="experiment-card-title">희망가격 비율 분포</h2>
                <CountTable
                  rows={RATIO_BUCKETS.map(([key, label]) => [
                    label,
                    metrics.askingPriceRatioDistribution[key] ?? 0,
                  ])}
                />
              </div>

              <div className="experiment-card">
                <h2 className="experiment-card-title">편의점별 신청 수</h2>
                <CountTable
                  rows={Object.entries(STORE_LABELS).map(([key, label]) => [
                    label,
                    metrics.convenienceStoreCounts[key] ?? 0,
                  ])}
                />
              </div>

              <div className="experiment-card">
                <h2 className="experiment-card-title">행사 유형별 신청 수</h2>
                <CountTable
                  rows={Object.entries(PROMOTION_LABELS).map(([key, label]) => [
                    label,
                    metrics.promotionTypeCounts[key] ?? 0,
                  ])}
                />
              </div>

              <div className="experiment-card">
                <h2 className="experiment-card-title">신청 상태별 수</h2>
                <CountTable
                  rows={Object.entries(REQUEST_STATUS_LABELS).map(([key, label]) => [
                    label,
                    metrics.saleRequestStatusCounts[key] ?? 0,
                  ])}
                />
              </div>

              <div className="experiment-card">
                <h2 className="experiment-card-title">상품 결과별 수</h2>
                <CountTable
                  rows={Object.entries(ITEM_RESULT_LABELS).map(([key, label]) => [
                    label,
                    metrics.itemResultCounts[key] ?? 0,
                  ])}
                />
              </div>

              <div className="experiment-card">
                <h2 className="experiment-card-title">재신청 판매자 수</h2>
                <p className="experiment-repeat-value">{metrics.repeatSellers}</p>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}