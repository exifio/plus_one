import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MOCK_APPLICATIONS } from '../../mocks/applications';
import {
  STATUS_FILTERS,
  STATUS_LABELS,
  formatWon,
  formatDate,
  statusBadgeClass,
  type StatusFilter,
} from '../../utils/adminStatus';

export const AdminApplicationsPage: React.FC = () => {
  const [filter, setFilter] = useState<StatusFilter>('ALL');
  const navigate = useNavigate();

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
                <tr
                  key={application.id}
                  className="application-row"
                  onClick={() => navigate(`/admin/applications/${application.id}`)}
                  tabIndex={0}
                  role="link"
                  aria-label={`${application.productName} 신청 상세 보기`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/admin/applications/${application.id}`);
                    }
                  }}
                >
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
