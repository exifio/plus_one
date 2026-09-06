import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useServer } from '../../server/ServerContext';
import StatusBadge from '../components/StatusBadge';
import AdminNav from '../components/AdminNav';
import { formatDateTime, formatPhoneNumber } from '../../seller/utils/format';
import { CONTACT_OPTIONS, PROMOTION_OPTIONS, STORE_OPTIONS, labelFor } from '../../seller/utils/options';

const FILTERS = [
  { value: 'all', label: '전체' },
  { value: 'received', label: '접수됨' },
  { value: 'contacting', label: '연락중' },
  { value: 'completed', label: '처리완료' },
];

function formatContact(contact) {
  if (!contact?.contact_value) return '연락처 없음';
  if (contact.contact_type === 'phone') {
    return formatPhoneNumber(contact.contact_value);
  }
  return contact.contact_value;
}

function formatRegistrationMethod(request) {
  if (request.registration_method === 'screenshot' || Boolean(request.evidence_image)) {
    return '이미지';
  }
  return '텍스트';
}

export default function AdminListPage() {
  const { adminApi } = useServer();
  const [requests, setRequests] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    let cancelled = false;

    adminApi
      .getSaleRequests()
      .then(async (data) => {
        if (cancelled) return;
        setRequests(data);

        const needsDetail = data.filter((item) => item.registration_method === undefined);
        if (needsDetail.length > 0) {
          const enriched = await Promise.all(
            data.map(async (item) => {
              if (item.registration_method !== undefined) return item;
              try {
                const detail = await adminApi.getSaleRequest(item.sale_request_id);
                return {
                  ...item,
                  registration_method: detail.registration_method,
                  evidence_image: detail.evidence_image,
                };
              } catch {
                return item;
              }
            }),
          );
          if (!cancelled) setRequests(enriched);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
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

        {loadError ? (
          <p className="admin-empty">신청을 불러오지 못했어요. 잠시 후 다시 시도해주세요.</p>
        ) : requests === null ? (
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
                    {formatContact(request.seller_contact)}
                  </strong>
                  <p className="request-meta">
                    {labelFor(STORE_OPTIONS, request.convenience_store)} ·{' '}
                    {labelFor(PROMOTION_OPTIONS, request.promotion_type)} ·{' '}
                    {labelFor(CONTACT_OPTIONS, request.seller_contact?.contact_type)} ·{' '}
                    {formatRegistrationMethod(request)}
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
