import StatusBadge from './StatusBadge';
import { formatDate, formatPrice } from '../../seller/utils/format';

export default function AdminItemCard({ item, onPurchase, onReject }) {
  return (
    <article className="item-card admin-item">
      <div className="admin-item-head">
        <strong className="review-item-name">
          {item.product_name}
        </strong>
        <StatusBadge status={item.result} />
      </div>
      <dl className="review-grid">
        <dt>유효기간</dt>
        <dd>{formatDate(item.expiration_date)}</dd>
        <dt>행사가</dt>
        <dd>{formatPrice(item.original_price)}</dd>
        <dt>희망가</dt>
        <dd>{formatPrice(item.asking_price)}</dd>
      </dl>

      {item.result === 'pending' ? (
        <div className="admin-item-actions">
          <button
            type="button"
            className="btn-primary btn-small"
            onClick={() => onPurchase(item)}
          >
            구매
          </button>
          <button
            type="button"
            className="btn-secondary btn-small"
            onClick={() => onReject(item)}
          >
            거절
          </button>
        </div>
      ) : item.result === 'purchased' ? (
        <div className="admin-item-result purchased">
          <p>✓ 구매 완료</p>
          <span className="admin-result-label">구매 증빙</span>
          <img
            src={item.purchase_evidence}
            alt="구매 증빙 이미지"
            className="admin-evidence small"
          />
        </div>
      ) : (
        <div className="admin-item-result rejected">
          <p>거절</p>
          <span className="admin-result-label">거절 이유</span>
          <p className="admin-reason">{item.rejection_reason}</p>
        </div>
      )}
    </article>
  );
}
