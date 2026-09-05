import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useServer } from '../../server/ServerContext';
import StatusBadge from '../components/StatusBadge';
import AdminNav from '../components/AdminNav';
import { formatDateTime } from '../../seller/utils/format';
import { CONTACT_OPTIONS, PROMOTION_OPTIONS, STORE_OPTIONS, labelFor } from '../../seller/utils/options';

const FILTERS = [
  { value: 'all', label: '전체' },
  { value: 'received', label: '접수됨' },
  { value: 'contacting', label: '연락중' },
  { value: 'completed', label: '처리완료' },
];

export default function AdminListPage() {
  const { adminApi } = useServer();
  const [requests, setRequests] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    let cancelled = false;

    adminApi
      .getSaleRequests()
      .then((data) => {
        if (!cancelled) setRequests(data);
      })
      .catch(() => {
        if (!cancelled) setRequests([]);
      });

    return () => {
      cancelled = true;
    };
  }, [adminApi]);

  const visible = (requests ?? []).filter(
    (request) => filter === 'all' || request.status === filter,
  );

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
        <h1 className="admin-title">신청목록</h1>

        <div className="admin-filters">
          {FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`filter-chip${filter === option.value ? ' active' : ''}`}
              onClick={() => setFilter(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>

        {requests === null ? (
          <p className="admin-loading">불러오는 중…</p>
        ) : visible.length === 0 ? (
          <p className="admin-empty">아직 접수된 판매 신청이 없습니다.</p>
        ) : (
          <ul className="request-list">
            {visible.map((request) => (
              <li key={request.sale_request_id}>
                <Link to={`/admin/${request.sale_request_id}`} className="request-card">
                  <div className="request-card-top">
                    <span className="request-time">
                      {formatDateTime(request.created_at)}
                    </span>
                    <StatusBadge status={request.status} />
                  </div>
                  <strong className="request-condition">
                    {labelFor(STORE_OPTIONS, request.convenience_store)} ·{' '}
                    {labelFor(PROMOTION_OPTIONS, request.promotion_type)}
                  </strong>
                  <p className="request-meta">
                    상품 {request.items_count}개 ·{' '}
                    {labelFor(CONTACT_OPTIONS, request.seller_contact.contact_type)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
