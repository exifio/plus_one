import EvidenceThumb from '../EvidenceThumb';
import { formatDate, formatPrice } from '../../utils/format';
import { CONTACT_OPTIONS, PROMOTION_OPTIONS, STORE_OPTIONS, labelFor } from '../../utils/options';

export default function StepReview({ draft, onGoStep }) {
  return (
    <section className="step">
      <h1 className="step-title">판매 신청 내용을 확인해주세요</h1>
      <p className="step-desc">마지막으로 입력한 내용을 확인해주세요.</p>

      <section className="review-section">
        <div className="review-head">
          <span className="review-label">신청 조건</span>
          <button type="button" className="review-change" onClick={() => onGoStep(1)}>
            변경
          </button>
        </div>
        <p className="review-condition">
          {labelFor(STORE_OPTIONS, draft.convenienceStore)} ·{' '}
          {labelFor(PROMOTION_OPTIONS, draft.promotionType)}
        </p>
      </section>

      <section className="review-section">
        <div className="review-head">
          <span className="review-label">상품 정보</span>
          <button type="button" className="review-change" onClick={() => onGoStep(2)}>
            변경
          </button>
        </div>
        {draft.items.map((item) => (
          <article key={item.id} className="review-item">
            <strong className="review-item-name">{item.productName}</strong>
            <dl className="review-grid">
              <dt>유효기간</dt>
              <dd>{formatDate(item.expirationDate)}</dd>
              <dt>행사 당시 가격</dt>
              <dd>{formatPrice(item.originalPrice)}</dd>
              <dt className="review-emphasis">판매 희망 가격</dt>
              <dd className="review-emphasis">{formatPrice(item.askingPrice)}</dd>
            </dl>
          </article>
        ))}
      </section>

      <section className="review-section">
        <div className="review-head">
          <span className="review-label">보관상품 확인</span>
          <button type="button" className="review-change" onClick={() => onGoStep(3)}>
            변경
          </button>
        </div>
        <EvidenceThumb image={draft.evidenceImage} alt="보관상품 확인 이미지" />
      </section>

      <section className="review-section">
        <div className="review-head">
          <span className="review-label">연락 정보</span>
          <button type="button" className="review-change" onClick={() => onGoStep(4)}>
            변경
          </button>
        </div>
        <dl className="review-grid">
          <dt>연락 방법</dt>
          <dd>{labelFor(CONTACT_OPTIONS, draft.contactType)}</dd>
          <dt>연락처</dt>
          <dd>{draft.contactValue}</dd>
        </dl>
      </section>
    </section>
  );
}
