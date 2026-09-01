import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { submitApplication } from '../../services/applicationService';
import type { Application, PromotionType, Store } from '../../types';
import type { SellerLayoutContext } from '../../layouts/SellerLayout';
import { StepProgressBar } from '../../components/StepProgressBar';
import { PriceSelection, type PriceResult } from './PriceSelection';
import { calculateUnitBasePrice } from '../../utils/price';
import {
  fieldErrorsFromZod,
  productInfoSchema,
  type FieldErrors,
  type ProductInfo,
} from './productInfoSchema';
import {
  contactInfoSchema,
  fieldErrorsFromContactZod,
  type ContactFieldErrors,
  type ContactInfo,
  type ContactType,
} from './contactSchema';

const STORES: readonly Store[] = ['GS25', 'CU'];
const PROMOTIONS: readonly PromotionType[] = ['1+1', '2+1'];

type ApplyStep = 'store' | 'product_info' | 'price' | 'contact' | 'confirm' | 'complete';

export function ApplyPage() {
  const outletContext = useOutletContext<SellerLayoutContext | undefined>();
  const setHeaderBack = outletContext?.setHeaderBack;
  const recruitmentStatus = outletContext?.recruitmentStatus;
  const status = recruitmentStatus ?? 'OPEN';
  const recruitmentLoading = outletContext !== undefined && recruitmentStatus === null;
  const canApply =
    !recruitmentLoading &&
    !outletContext?.recruitmentError &&
    (outletContext === undefined ? status === 'OPEN' : recruitmentStatus === 'OPEN');

  // Wizard step
  const [currentStep, setCurrentStep] = useState<ApplyStep>('store');

  const [store, setStore] = useState<Store | ''>('');
  const [promotionType, setPromotionType] = useState<PromotionType | ''>('');
  const promotionSectionRef = useRef<HTMLFieldSetElement | null>(null);

  // Step 3: Product Info
  const [productName, setProductName] = useState('');
  const [originalPaidPrice, setOriginalPaidPrice] = useState('');
  const [quantity] = useState('1');
  const [expiryDate, setExpiryDate] = useState('');
  const [productErrors, setProductErrors] = useState<FieldErrors>({});
  const [savedProduct, setSavedProduct] = useState<ProductInfo | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 2800);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Step 4: Price Selection
  const [priceResult, setPriceResult] = useState<PriceResult | null>(null);

  // Step 5: Contact
  const [contactType, setContactType] = useState<ContactType | ''>('phone');
  const [contactValue, setContactValue] = useState('');
  const [contactErrors, setContactErrors] = useState<ContactFieldErrors>({});
  const [savedContact, setSavedContact] = useState<ContactInfo | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Completed
  const [submittedApplication, setSubmittedApplication] = useState<Application | null>(null);

  // Sync header back button dynamically based on current step
  useEffect(() => {
    if (!setHeaderBack) return;

    switch (currentStep) {
      case 'store':
        setHeaderBack({ label: '← 처음으로', to: '/' });
        break;
      case 'product_info':
        setHeaderBack({ label: '← 뒤로가기', onClick: () => setCurrentStep('store') });
        break;
      case 'price':
        setHeaderBack({ label: '← 뒤로가기', onClick: () => setCurrentStep('product_info') });
        break;
      case 'contact':
        setHeaderBack({ label: '← 뒤로가기', onClick: () => setCurrentStep('price') });
        break;
      case 'confirm':
        setHeaderBack({ label: '← 뒤로가기', onClick: () => setCurrentStep('contact') });
        break;
      case 'complete':
        setHeaderBack(null);
        break;
    }
  }, [currentStep, setHeaderBack]);

  const clearProductError = (field: keyof FieldErrors) => {
    setProductErrors((current) => {
      if (current[field] === undefined) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const clearContactError = (field: keyof ContactFieldErrors) => {
    setContactErrors((current) => {
      if (current[field] === undefined) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const handleSelectStore = (selectedStore: Store) => {
    setStore(selectedStore);
    setTimeout(() => {
      promotionSectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 50);
  };

  const handleSelectPromotion = (selectedPromo: PromotionType) => {
    setPromotionType(selectedPromo);
  };

  const handleProductTypeSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!store || !promotionType) return;
    setCurrentStep('product_info');
  };

  const handleProductSubmit = (event: FormEvent<HTMLFormElement>) => {
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
      setProductErrors(fieldErrorsFromZod(parsed.error));
      return;
    }

    setProductErrors({});
    setSavedProduct(parsed.data);
    setCurrentStep('price');
  };

  const handlePriceSelect = (result: PriceResult) => {
    setPriceResult(result);
    setCurrentStep('contact');
  };

  const handleContactSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = contactInfoSchema.safeParse({
      contactType,
      contactValue,
    });

    if (!parsed.success) {
      setContactErrors(fieldErrorsFromContactZod(parsed.error));
      return;
    }

    setContactErrors({});
    setSavedContact(parsed.data);
    setCurrentStep('confirm');
  };

  const handleFinalSubmit = async () => {
    if (!savedProduct || !priceResult || !savedContact || isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const newAppId = await submitApplication({
        store: savedProduct.store,
        promotionType: savedProduct.promotionType,
        productName: savedProduct.productName,
        originalPaidPrice: savedProduct.originalPaidPrice,
        quantity: savedProduct.quantity,
        expiryDate: savedProduct.expiryDate,
        unitBasePrice: priceResult.unitBasePrice,
        initialRatio: priceResult.initialRatio,
        initialPrice: priceResult.initialPrice,
        hadPriceOffer: priceResult.hadPriceOffer,
        offeredRatio: priceResult.offeredRatio,
        offeredPrice: priceResult.offeredPrice,
        offerAccepted: priceResult.offerAccepted,
        finalRatio: priceResult.finalRatio,
        finalPrice: priceResult.finalPrice,
        contactType: savedContact.contactType,
        contactValue: savedContact.contactValue,
      });

      const newApp: Application = {
        id: newAppId,
        createdAt: new Date().toISOString(),
        store: savedProduct.store,
        promotionType: savedProduct.promotionType,
        productName: savedProduct.productName,
        originalPaidPrice: savedProduct.originalPaidPrice,
        quantity: savedProduct.quantity,
        expiryDate: savedProduct.expiryDate,
        unitBasePrice: priceResult.unitBasePrice,
        initialRatio: priceResult.initialRatio,
        initialPrice: priceResult.initialPrice,
        hadPriceOffer: priceResult.hadPriceOffer,
        offeredRatio: priceResult.offeredRatio,
        offeredPrice: priceResult.offeredPrice,
        offerAccepted: priceResult.offerAccepted,
        finalRatio: priceResult.finalRatio,
        finalPrice: priceResult.finalPrice,
        contactType: savedContact.contactType,
        contactValue: savedContact.contactValue,
        status: 'SUBMITTED',
      };

      setSubmittedApplication(newApp);
      setCurrentStep('complete');
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'RECRUITMENT_NOT_OPEN') {
        setSubmitError('현재는 모집이 중단되어 판매 신청을 접수할 수 없습니다.');
      } else {
        setSubmitError('신청 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="apply-page">
      {outletContext?.recruitmentError && (
        <div className="status-notice status-notice-closed" role="alert">
          <strong className="status-notice-title">신청 가능 여부를 확인하지 못했어요</strong>
          <p className="status-notice-desc">잠시 후 다시 확인해주세요.</p>
        </div>
      )}

      {recruitmentLoading && (
        <div className="status-notice status-notice-paused" role="status">
          <strong className="status-notice-title">신청 가능 여부를 확인하고 있어요</strong>
          <p className="status-notice-desc">잠시만 기다려주세요.</p>
        </div>
      )}

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

      {canApply && (
        <>
          {currentStep === 'store' && (
            <section className="wizard-step wizard-step-sticky-cta card" aria-labelledby="step-product-type-title">
              <StepProgressBar currentStep={1} stepTitle="상품 유형 선택" />
              <div className="page-header">
                <h1 className="page-title" id="step-product-type-title">
                  어떤 보관상품을 판매하시나요?
                </h1>
                <p className="page-desc">
                  보관 중인 편의점과 행사 유형을 선택해주세요.
                </p>
              </div>

              <form className="apply-form" onSubmit={handleProductTypeSubmit} noValidate>
                <fieldset className="form-group">
                  <legend className="form-label" id="store-label">편의점 선택</legend>
                  <div className="choice-grid choice-grid-hero" role="radiogroup" aria-labelledby="store-label">
                    {STORES.map((option) => (
                      <button
                        key={option}
                        type="button"
                        className={`choice-card choice-card-hero ${store === option ? 'is-selected' : ''}`}
                        onClick={() => handleSelectStore(option)}
                        aria-pressed={store === option}
                      >
                        <strong className="choice-hero-name">{option}</strong>
                        <span className="choice-hero-desc">
                          {option === 'GS25' ? '나만의 냉장고 보관상품' : '포켓CU 보관상품'}
                        </span>
                      </button>
                    ))}
                  </div>
                </fieldset>

                {store && (
                  <fieldset ref={promotionSectionRef} className="form-group promotion-form-group" aria-live="polite">
                    <legend className="form-label" id="promotion-label">어떤 행사로 구매하셨나요?</legend>
                    <div className="choice-grid choice-grid-hero" role="radiogroup" aria-labelledby="promotion-label">
                      {PROMOTIONS.map((option) => (
                        <button
                          key={option}
                          type="button"
                          className={`choice-card choice-card-hero ${promotionType === option ? 'is-selected' : ''}`}
                          onClick={() => handleSelectPromotion(option)}
                          aria-pressed={promotionType === option}
                        >
                          <strong className="choice-hero-name">{option}</strong>
                          <span className="choice-hero-desc">
                            {option === '1+1' ? '1개 구매 시 1개 증정 (총 2개)' : '2개 구매 시 1개 증정 (총 3개)'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </fieldset>
                )}

                <div className="wizard-actions wizard-actions-sticky-cta">
                  <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={!store || !promotionType}>
                    다음
                  </button>
                </div>
              </form>
            </section>
          )}

          {currentStep === 'product_info' && (
            <section className="wizard-step card">
              <StepProgressBar currentStep={2} stepTitle="상품 정보 입력" tags={[store, promotionType]} />
              <div className="page-header">
                <h1 className="page-title">상품 정보를 입력해주세요</h1>
                <p className="page-desc">
                  희망 판매가격은 입력하신 정보를 바탕으로 다음 단계에서 바로 계산됩니다.
                </p>
              </div>

              <form className="apply-form" onSubmit={handleProductSubmit} noValidate>
                <div className="form-group">
                  <label className="form-label" htmlFor="quantity">판매 희망 수량</label>
                  <button
                    id="quantity"
                    type="button"
                    className="form-input form-input-fixed"
                    onClick={() => {
                      setToastMessage('현재는 1개 단위 신청만 가능해요!\n다량 판매 기능은 준비 중 입니다.');
                      clearProductError('quantity');
                    }}
                    aria-label="판매 희망 수량 1개 (수량 변경 불가 안내 보기)"
                  >
                    <span className="fixed-value">1개</span>
                  </button>
                  <span className="form-input-help">현재는 1개 단위 판매 신청만 지원하고 있어요.</span>
                  {productErrors.quantity !== undefined && (
                    <p className="form-error">{productErrors.quantity}</p>
                  )}
                </div>

                <div className="form-group">
                  <div className="form-label-row">
                    <label className="form-label" htmlFor="expiry-date">
                      유효기간
                    </label>
                    <span className="optional-badge">선택</span>
                  </div>
                  <input
                    id="expiry-date"
                    className="form-input"
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={expiryDate}
                    onClick={(event) => {
                      try {
                        event.currentTarget.showPicker();
                      } catch {}
                    }}
                    onChange={(event) => {
                      setExpiryDate(event.target.value);
                      clearProductError('expiryDate');
                    }}
                  />
                  <span className="form-input-help">꼭 입력하지 않으셔도 괜찮아요</span>
                  {productErrors.expiryDate !== undefined && (
                    <p className="form-error">{productErrors.expiryDate}</p>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="product-name">상품명</label>
                  <input
                    id="product-name"
                    className="form-input"
                    type="text"
                    autoComplete="off"
                    placeholder="예: 코카콜라 500ml, 바나나맛우유"
                    value={productName}
                    onChange={(event) => {
                      setProductName(event.target.value);
                      clearProductError('productName');
                    }}
                  />
                  {productErrors.productName !== undefined && (
                    <p className="form-error">{productErrors.productName}</p>
                  )}
                </div>

                {/* 4. 1+1 행사 당시 결제 금액 */}
                <div className="form-group">
                  <label className="form-label" htmlFor="paid-price">
                    {promotionType ? `${promotionType} 행사 당시 결제 금액` : '행사 당시 결제 금액'}
                  </label>
                  <div className="input-with-unit">
                    <input
                      id="paid-price"
                      className="form-input"
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="예: 3600"
                      value={originalPaidPrice}
                      onChange={(event) => {
                        setOriginalPaidPrice(event.target.value);
                        clearProductError('originalPaidPrice');
                      }}
                    />
                    <span className="input-unit">원</span>
                  </div>
                  {(() => {
                    const parsedNum = Number(originalPaidPrice.replace(/\D/g, ''));
                    if (parsedNum > 0 && promotionType) {
                      const unitPrice = calculateUnitBasePrice(parsedNum, promotionType as PromotionType);
                      const qty = promotionType === '1+1' ? 2 : 3;
                      return (
                        <span className="form-input-help is-calculated">
                          총 {parsedNum.toLocaleString('ko-KR')}원 기준 <strong>1개당 약 {unitPrice.toLocaleString('ko-KR')}원</strong> ({parsedNum.toLocaleString('ko-KR')}원 ÷ {qty}개)
                        </span>
                      );
                    }
                    return null;
                  })()}
                  {productErrors.originalPaidPrice !== undefined && (
                    <p className="form-error">{productErrors.originalPaidPrice}</p>
                  )}
                </div>

                <div className="wizard-actions">
                  <button type="submit" className="btn btn-primary btn-lg btn-block">
                    다음
                  </button>
                </div>
              </form>
            </section>
          )}

          {currentStep === 'price' && savedProduct && (
            <section className="wizard-step">
              <PriceSelection
                productInfo={savedProduct}
                initialPriceResult={priceResult}
                onPriceSelect={handlePriceSelect}
                onBack={() => setCurrentStep('product_info')}
              />
            </section>
          )}

          {currentStep === 'contact' && (
            <form className="apply-form card" onSubmit={handleContactSubmit} noValidate>
              <StepProgressBar currentStep={4} stepTitle="연락 수단 입력" tags={[store, promotionType]} />
              <div className="page-header">
                <h1 className="page-title">연락 수단을 입력해주세요</h1>
                <p className="page-desc">
                   신청 내용을 확인한 후 판매 진행이 가능한 경우<br />
                   입력하신 연락처로 안내드릴게요.
                </p>
              </div>

              <fieldset className="form-group form-group-contact">
                <legend className="form-label" id="contact-type-label">연락 수단 종류</legend>
                <div className="choice-grid" role="radiogroup" aria-labelledby="contact-type-label">
                  <label className={`choice-card ${contactType === 'phone' ? 'is-selected' : ''}`}>
                    <input
                      type="radio"
                      name="contactType"
                      value="phone"
                      checked={contactType === 'phone'}
                      onChange={() => {
                        setContactType('phone');
                        clearContactError('contactType');
                      }}
                    />
                    <span>휴대전화 번호</span>
                  </label>
                  <label className={`choice-card ${contactType === 'kakao' ? 'is-selected' : ''}`}>
                    <input
                      type="radio"
                      name="contactType"
                      value="kakao"
                      checked={contactType === 'kakao'}
                      onChange={() => {
                        setContactType('kakao');
                        clearContactError('contactType');
                      }}
                    />
                    <span>카카오톡</span>
                    <span className="choice-card-sub">ID / 링크</span>
                  </label>
                </div>
                {contactErrors.contactType !== undefined && (
                  <p className="form-error">{contactErrors.contactType}</p>
                )}
              </fieldset>

              <div className="form-group">
                <label className="form-label" htmlFor="contact-value">
                  {contactType === 'kakao' ? '카카오톡 ID 또는 오픈채팅 링크' : '휴대전화 번호'}
                </label>
                <input
                  id="contact-value"
                  className="form-input"
                  type={contactType === 'phone' ? 'tel' : 'text'}
                  autoComplete={contactType === 'phone' ? 'tel' : 'off'}
                  placeholder={
                    contactType === 'kakao'
                      ? '카카오톡 ID 또는 오픈채팅 링크를 입력해주세요'
                      : '010-1234-5678'
                  }
                  value={contactValue}
                  onChange={(event) => {
                    setContactValue(event.target.value);
                    clearContactError('contactValue');
                  }}
                />
                {contactErrors.contactValue !== undefined && (
                  <p className="form-error">{contactErrors.contactValue}</p>
                )}
                <span className="form-input-help">
                  {contactType === 'kakao'
                    ? '판매 진행이 확정되면 카카오톡으로 증빙과 QR을 확인해요.'
                    : '판매 진행이 확정되면 문자로 증빙과 QR을 확인해요.'}
                </span>
              </div>

              <div className="wizard-actions">
                <button type="submit" className="btn btn-primary btn-lg btn-block">
                  다음
                </button>
              </div>
            </form>
          )}

         {currentStep === 'confirm' && savedProduct && priceResult && savedContact && (
            <>
            <div className="confirm-section card">
              <StepProgressBar currentStep={5} stepTitle="최종 확인" tags={[store, promotionType]} />
              <div className="page-header">
                <h1 className="page-title">신청 내용을 확인해주세요</h1>
                <p className="page-desc">
                  내용을 확인 후 판매 신청을 완료해주세요.
                </p>
              </div>

             {/* Product Info Block */}
             <div className="confirm-block">
               <div className="confirm-block-header">
                 <h2 className="confirm-block-title">상품 정보</h2>
               </div>
               <dl className="confirm-dl">
                 <div className="confirm-dl-row">
                   <dt>편의점</dt>
                   <dd>{savedProduct.store}</dd>
                 </div>
                 <div className="confirm-dl-row">
                   <dt>행사 유형</dt>
                   <dd>{savedProduct.promotionType}</dd>
                 </div>
                 <div className="confirm-dl-row">
                   <dt>상품명</dt>
                   <dd>{savedProduct.productName}</dd>
                 </div>
                 <div className="confirm-dl-row">
                   <dt>실제 결제금액</dt>
                   <dd>{savedProduct.originalPaidPrice.toLocaleString('ko-KR')}원</dd>
                 </div>
                 <div className="confirm-dl-row">
                   <dt>판매 희망 수량</dt>
                   <dd>{savedProduct.quantity}개</dd>
                 </div>
                 <div className="confirm-dl-row">
                   <dt>소비기한/유효기간</dt>
                   <dd>{savedProduct.expiryDate || '미입력'}</dd>
                 </div>
               </dl>
             </div>

             {/* Price Info Block */}
             <div className="confirm-block">
               <div className="confirm-block-header">
                 <h2 className="confirm-block-title">판매 희망가격</h2>
               </div>
               <dl className="confirm-dl">
                 <div className="confirm-dl-row">
                   <dt>행사 기준 1개 가격</dt>
                   <dd>{priceResult.unitBasePrice.toLocaleString('ko-KR')}원</dd>
                 </div>
                 <div className="confirm-dl-row is-highlight">
                   <dt>최종 희망 판매가격</dt>
                   <dd>
                     <strong className="confirm-price-value">
                       {priceResult.finalPrice.toLocaleString('ko-KR')}원
                     </strong>
                   </dd>
                 </div>
                 {priceResult.hadPriceOffer && (
                   <div className="confirm-dl-row confirm-dl-sub">
                     <dt>가격 확인 이력</dt>
                     <dd>
                       {priceResult.offerAccepted
                         ? `${priceResult.offeredPrice?.toLocaleString('ko-KR')}원 (${priceResult.offeredRatio}%) 확인 수락`
                         : `처음 희망가 ${priceResult.initialPrice.toLocaleString('ko-KR')}원 (${priceResult.initialRatio}%) 유지`}
                     </dd>
                   </div>
                 )}
                 {priceResult.finalPrice === 0 && (
                   <div className="confirm-dl-row">
                     <dt>참고</dt>
                     <dd className="confirm-zero-note">무상 양도/처분 의향으로 등록됩니다.</dd>
                   </div>
                 )}
               </dl>
             </div>

             {/* Contact Info Block */}
             <div className="confirm-block">
               <div className="confirm-block-header">
                 <h2 className="confirm-block-title">연락 수단</h2>
               </div>
               <dl className="confirm-dl">
                 <div className="confirm-dl-row">
                   <dt>구분</dt>
                   <dd>{savedContact.contactType === 'phone' ? '휴대전화 번호' : '카카오톡'}</dd>
                 </div>
                 <div className="confirm-dl-row">
                   <dt>연락처</dt>
                   <dd><strong>{savedContact.contactValue}</strong></dd>
                 </div>
               </dl>
             </div>

            <div className="confirm-guide-box">
              <p className="confirm-guide-text">
                신청 내용을 확인한 후 판매 진행이 가능한 경우<br />
                입력하신 연락처로 안내드릴게요.
              </p>
            </div>

           </div>

              {submitError && (
                <div className="status-notice status-notice-closed" role="alert" style={{ margin: '16px 0' }}>
                  <strong className="status-notice-title">{submitError}</strong>
                </div>
              )}
              <div className="confirm-bottom-bar">
                <div className="confirm-bottom-bar-inner">
                  <button
                    type="button"
                    className="btn btn-secondary btn-confirm-edit"
                    onClick={() => setCurrentStep('product_info')}
                  >
                    내용 수정
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-confirm-submit"
                    disabled={isSubmitting}
                    onClick={handleFinalSubmit}
                  >
                    {isSubmitting ? '신청 처리 중...' : '판매 신청 완료하기'}
                  </button>
                </div>
              </div>
            </>
         )}

          {currentStep === 'complete' && submittedApplication && (
            <div className="complete-card card" role="status">
              <div className="complete-icon-box" aria-hidden="true">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>

              <div className="complete-header">
                <span className="complete-badge">신청 접수 완료</span>
                <h1 className="complete-title">판매 신청이 완료되었습니다</h1>
                <p className="complete-desc">
                  신청번호 <strong>{submittedApplication.id}</strong>로 정상 접수되었습니다.
                </p>
              </div>

              <div className="complete-notice-box">
                <h2 className="complete-notice-title">이후 진행 안내</h2>
                <ul className="complete-notice-list">
                   <li>신청 내용을 확인한 후 <strong>판매 진행이 가능한 경우</strong> 입력하신 연락처({submittedApplication.contactValue})로 안내드릴게요.</li>
                   <li>판매 진행 시에는 증빙과 QR을 확인한 뒤 입금이 진행돼요.</li>
                   <li>진행 불가 시에도 연락드릴게요.</li>
                </ul>
              </div>

              <div className="complete-summary">
                <h2 className="complete-summary-title">신청 내역 요약</h2>
                <dl className="complete-summary-dl">
                  <div>
                    <dt>상품</dt>
                    <dd>{submittedApplication.store} · {submittedApplication.productName} ({submittedApplication.quantity}개)</dd>
                  </div>
                  <div>
                    <dt>최종 희망가격</dt>
                    <dd>
                      <strong>{submittedApplication.finalPrice.toLocaleString('ko-KR')}원</strong>
                      <span> / 개당</span>
                    </dd>
                  </div>
                  <div>
                    <dt>연락처</dt>
                    <dd>{submittedApplication.contactValue}</dd>
                  </div>
                </dl>
              </div>

             <div className="wizard-actions">
                <Link to="/" className="btn btn-secondary btn-lg btn-block">
                  홈으로 이동
                </Link>
             </div>
            </div>
          )}
        </>
      )}

      {toastMessage && (
        <div className="toast-notification" role="status" aria-live="polite">
          <span className="toast-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </span>
          <span className="toast-text">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
