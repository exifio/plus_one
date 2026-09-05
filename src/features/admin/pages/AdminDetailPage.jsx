import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useServer } from '../../server/ServerContext';
import StatusBadge from '../components/StatusBadge';
import AdminItemCard from '../components/AdminItemCard';
import ActionModal from '../components/ActionModal';
import { formatDateTime } from '../../seller/utils/format';
import { CONTACT_OPTIONS, PROMOTION_OPTIONS, STORE_OPTIONS, labelFor } from '../../seller/utils/options';

export default function AdminDetailPage() {
  const { saleRequestId } = useParams();
  const { adminApi, storageApi } = useServer();
  const [detail, setDetail] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [startingContact, setStartingContact] = useState(false);
  const [contactError, setContactError] = useState(null);
  const [modal, setModal] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setDetail(null);
    setLoadError(false);

    adminApi.getSaleRequest(saleRequestId)
      .then((data) => { if (!cancelled) setDetail(data); })
      .catch(() => { if (!cancelled) setLoadError(true); });

    return () => { cancelled = true; };
  }, [adminApi, saleRequestId, reloadKey]);

  const reload = () => setReloadKey((key) => key + 1);

  const handleStartContact = async () => {
    setStartingContact(true);
    setContactError(null);
    try {
      await adminApi.startContact(saleRequestId);
      reload();
    } catch {
      setContactError('연락 시작에 실패했어요.');
    } finally {
      setStartingContact(false);
    }
  };

  if (loadError) {
    return (
      <div className="admin-page">
        <main className="admin-main">
          <Link to="/admin" className="admin-back">← 판매 신청 목록</Link>
          <p className="admin-empty">신청을 불러오지 못했어요.</p>
        </main>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="admin-page">
        <main className="admin-main"><p className="admin-loading">불러오는 중…</p></main>
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
      </header>

      <main className="admin-main">
        <Link to="/admin" className="admin-back">← 판매 신청 목록</Link>

        <section className="admin-detail-head">
          <h1 className="admin-title">
            {labelFor(STORE_OPTIONS, detail.convenience_store)} ·{' '}
            {labelFor(PROMOTION_OPTIONS, detail.promotion_type)}
          </h1>
          <div className="admin-detail-sub">
            <span>{formatDateTime(detail.created_at)}</span>
            <StatusBadge status={detail.status} />
          </div>
        </section>

        {detail.status === 'received' && (
          <button type="button" className="btn-primary admin-contact-start"
            onClick={handleStartContact} disabled={startingContact}>
            {startingContact ? '처리 중…' : '판매자에게 연락 시작'}
          </button>
        )}
        {contactError && <p className="field-error">{contactError}</p>}
        {detail.status === 'completed' && (
          <p className="admin-completed-banner">모든 상품 처리가 완료되었습니다.</p>
        )}

        <section className="review-section">
          <h3 className="review-label">판매자 연락처</h3>
          <dl className="review-grid">
            <dt>연락 방법</dt><dd>{labelFor(CONTACT_OPTIONS, detail.seller.contact_type)}</dd>
            <dt>연락처</dt><dd>{detail.seller.contact_value}</dd>
          </dl>
        </section>

        {detail.evidence_image && (
          <section className="review-section">
            <h3 className="review-label">상품 정보 스크린샷</h3>
            <img src={detail.evidence_image} alt="상품 정보 스크린샷" className="admin-evidence" />
          </section>
        )}

        <h3 className="admin-items-heading">상품 처리</h3>
        {detail.items.map((item) => (
          <AdminItemCard
            key={item.stored_item_id}
            item={item}
            onPurchase={(i) => setModal({ type: 'purchase', item: i })}
            onReject={(i) => setModal({ type: 'reject', item: i })}
          />
        ))}
      </main>

      {modal && (
        <ActionModal modal={modal} onClose={() => setModal(null)}
          onDone={reload} adminApi={adminApi} storageApi={storageApi} />
      )}
    </div>
  );
}
