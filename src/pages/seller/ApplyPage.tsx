import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { getRecruitmentStatus } from '../../mocks/recruitment';
import type { PromotionType, Store } from '../../types';
import {
  fieldErrorsFromZod,
  productInfoSchema,
  type FieldErrors,
  type ProductInfo,
} from './productInfoSchema';

const STORES: readonly Store[] = ['GS25', 'CU'];
const PROMOTIONS: readonly PromotionType[] = ['1+1', '2+1'];

export function ApplyPage() {
  const status = getRecruitmentStatus();
  const [store, setStore] = useState<Store | ''>('');
  const [promotionType, setPromotionType] = useState<PromotionType | ''>('');
  const [productName, setProductName] = useState('');
  const [originalPaidPrice, setOriginalPaidPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saved, setSaved] = useState<ProductInfo | null>(null);

  const clearError = (field: keyof FieldErrors) => {
    setErrors((current) => {
      if (current[field] === undefined) {
        return current;
      }
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = productInfoSchema.safeParse({
      store,
      promotionType,
      productName,
      originalPaidPrice,
      quantity,
      expiryDate,
    });

    if (!parsed.success) {
      setSaved(null);
      setErrors(fieldErrorsFromZod(parsed.error));
      return;
    }

    setErrors({});
    setSaved(parsed.data);
  };

  return (
    <div className="apply-page">
      <div className="page-header">
        <Link to="/" className="back-link">처음으로</Link>
        <h1 className="page-title">판매 신청</h1>
        <p className="page-desc">보관상품 정보를 입력해주세요. 희망 판매가격은 다음 단계에서 선택합니다.</p>
      </div>

      {status === 'PAUSED' && (
        <div className="status-notice status-notice-paused" role="status">
          <strong className="status-notice-title">지금은 신청을 잠시 멈춰두었어요</strong>
          <p className="status-notice-desc">
            신청이 다시 열리면 이 화면에서 바로 신청하실 수 있어요. 잠시 후 다시 확인해주세요.
          </p>
        </div>
      )}

      {status === 'CLOSED' && (
        <div className="status-notice status-notice-closed" role="status">
          <strong className="status-notice-title">이번 판매 신청은 마감되었어요</strong>
          <p className="status-notice-desc">
            신청을 받아주셔서 감사합니다. 다음 신청이 시작되면 다시 안내드릴게요.
          </p>
        </div>
      )}

      {status === 'OPEN' && (
        <>
          <form className="apply-form card" onSubmit={handleSubmit} noValidate>
            <fieldset className="form-group">
            <legend className="form-label" id="store-label">편의점</legend>
            <div className="choice-grid" role="radiogroup" aria-labelledby="store-label">
              {STORES.map((option) => (
                <label
                  key={option}
                  className={store === option ? 'choice-card is-selected' : 'choice-card'}
                >
                  <input
                    type="radio"
                    name="store"
                    value={option}
                    checked={store === option}
                    onChange={() => {
                      setStore(option);
                      clearError('store');
                    }}
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
            {errors.store !== undefined && <p className="form-error">{errors.store}</p>}
            </fieldset>

            <fieldset className="form-group">
            <legend className="form-label" id="promotion-label">행사 유형</legend>
            <div className="choice-grid" role="radiogroup" aria-labelledby="promotion-label">
              {PROMOTIONS.map((option) => (
                <label
                  key={option}
                  className={promotionType === option ? 'choice-card is-selected' : 'choice-card'}
                >
                  <input
                    type="radio"
                    name="promotionType"
                    value={option}
                    checked={promotionType === option}
                    onChange={() => {
                      setPromotionType(option);
                      clearError('promotionType');
                    }}
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
            {errors.promotionType !== undefined && (
              <p className="form-error">{errors.promotionType}</p>
            )}
            </fieldset>

            <div className="form-group">
            <label className="form-label" htmlFor="product-name">상품명</label>
            <input
              id="product-name"
              className="form-input"
              type="text"
              autoComplete="off"
              value={productName}
              onChange={(event) => {
                setProductName(event.target.value);
                clearError('productName');
              }}
            />
            {errors.productName !== undefined && (
              <p className="form-error">{errors.productName}</p>
            )}
            </div>

            <div className="form-group">
            <label className="form-label" htmlFor="paid-price">행사 당시 실제 결제금액</label>
            <div className="input-with-unit">
              <input
                id="paid-price"
                className="form-input"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={originalPaidPrice}
                onChange={(event) => {
                  setOriginalPaidPrice(event.target.value);
                  clearError('originalPaidPrice');
                }}
              />
              <span className="input-unit">원</span>
            </div>
            {errors.originalPaidPrice !== undefined && (
              <p className="form-error">{errors.originalPaidPrice}</p>
            )}
            </div>

            <div className="form-group">
            <label className="form-label" htmlFor="quantity">판매 희망 수량</label>
            <div className="input-with-unit">
              <input
                id="quantity"
                className="form-input"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={quantity}
                onChange={(event) => {
                  setQuantity(event.target.value);
                  clearError('quantity');
                }}
              />
              <span className="input-unit">개</span>
            </div>
            {errors.quantity !== undefined && <p className="form-error">{errors.quantity}</p>}
            </div>

            <div className="form-group">
            <label className="form-label" htmlFor="expiry-date">소비기한/유효기간</label>
            <input
              id="expiry-date"
              className="form-input"
              type="date"
              value={expiryDate}
              onChange={(event) => {
                setExpiryDate(event.target.value);
                clearError('expiryDate');
              }}
            />
            {errors.expiryDate !== undefined && <p className="form-error">{errors.expiryDate}</p>}
            </div>

            <button type="submit" className="btn btn-primary btn-lg btn-block">
              상품 정보 확인하기
            </button>

            {saved !== null && (
              <div className="saved-summary" role="status">
                <strong className="saved-summary-title">상품 정보가 확인되었습니다</strong>
                <ul className="saved-summary-list">
                  <li>편의점 {saved.store}</li>
                  <li>행사 {saved.promotionType}</li>
                  <li>상품명 {saved.productName}</li>
                  <li>결제금액 {saved.originalPaidPrice.toLocaleString('ko-KR')}원</li>
                  <li>수량 {saved.quantity}개</li>
                  <li>소비기한/유효기간 {saved.expiryDate}</li>
                </ul>
                <p className="saved-summary-note">희망 판매가격을 아래에서 선택해주세요.</p>
              </div>
            )}
          </form>
        </>
      )}
    </div>
  );
}
