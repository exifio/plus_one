import { useMemo, useState } from 'react';
import { MOCK_APPLICATIONS } from '../../mocks/applications';
import type { ApplicationStatus } from '../../types';

type StatusFilter = 'ALL' | ApplicationStatus;

const STATUS_FILTERS: ReadonlyArray<{ value: StatusFilter; label: string }> = [
  { value: 'ALL', label: '전체' },
  { value: 'SUBMITTED', label: '신청됨' },
  { value: 'CONTACTED', label: '연락함' },
  { value: 'EVIDENCE_VERIFIED', label: '증빙 확인' },
  { value: 'QR_RECEIVED', label: 'QR 전달' },
  { value: 'COMPLETED', label: '거래 완료' },
  { value: 'NOT_PURCHASED', label: '매입 안 함' },
  { value: 'FAILED', label: '진행 실패' },
];

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  SUBMITTED: '신청됨',
  CONTACTED: '연락함',
  EVIDENCE_VERIFIED: '증빙 확인',
  QR_RECEIVED: 'QR 전달',
  COMPLETED: '거래 완료',
  NOT_PURCHASED: '매입 안 함',
  FAILED: '진행 실패',
};

const formatWon = (price: number): string =>
  price === 0 ? '무상 양도' : `${price.toLocaleString('ko-KR')}원`;

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

function statusBadgeClass(status: ApplicationStatus): string {
  switch (status) {
    case 'COMPLETED':
      return 'status-badge status-badge-success';
    case 'NOT_PURCHASED':
    case 'FAILED':
      return 'status-badge status-badge-danger';
    case 'CONTACTED':
    case 'EVIDENCE_VERIFIED':
    case 'QR_RECEIVED':
      return 'status-badge status-badge-warning';
    default:
      return 'status-badge status-badge-neutral';
  }
}

export const AdminApplicationsPage: React.FC = () => {
  const [filter, setFilter] = useState<StatusFilter>('ALL');

  const applications = useMemo(
    () =>
      filter === 'ALL'
        ? MOCK_APPLICATIONS
        : MOCK_APPLICATIONS.filter((application) => application.status === filter),
    [filter],
  );

  return (
    <div className="admin-dashboard-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">신청 목록</h1>
        <p className="admin-page-subtitle">
          접수된 보관상품 판매 신청 현황입니다. 상태별로 빠르게 확인할 수 있어요.
        </p>
      </div>

      <div className="filter-bar" role="group" aria-label="신청 상태 필터">
        {STATUS_FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={filter === option.value ? 'filter-chip is-active' : 'filter-chip'}
            aria-pressed={filter === option.value}
            onClick={() => setFilter(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {applications.length === 0 ? (
        <div className="card admin-empty-card">
          <p>선택한 상태의 신청이 아직 없어요.</p>
        </div>
      ) : (
        <div className="table-card">
          <table className="applications-table">
            <thead>
              <tr>
                <th scope="col">신청일</th>
                <th scope="col">편의점</th>
                <th scope="col">상품명</th>
                <th scope="col">수량</th>
                <th scope="col">최초 희망가격</th>
                <th scope="col">최종 희망가격</th>
                <th scope="col">현재 상태</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((application) => (
                <tr key={application.id}>
                  <td>{formatDate(application.createdAt)}</td>
                  <td>{application.store}</td>
                  <td className="cell-product">{application.productName}</td>
                  <td>{application.quantity}개</td>
                  <td>{formatWon(application.initialPrice)}</td>
                  <td className="cell-final-price">{formatWon(application.finalPrice)}</td>
                  <td>
                    <span className={statusBadgeClass(application.status)}>
                      {STATUS_LABELS[application.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
