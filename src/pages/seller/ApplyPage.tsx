import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { submitApplication, uploadScreenshot } from '../../services/applicationService';
import type { Application, PromotionType, Store } from '../../types';
import type { SellerLayoutContext } from '../../layouts/SellerLayout';
import { StepProgressBar } from '../../components/StepProgressBar';
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
import {
  desiredPriceSchema,
  fieldErrorsFromDesiredPriceZod,
} from './desiredPriceSchema';

const STORES: readonly Store[] = ['GS25', 'CU'];
const PROMOTIONS: readonly PromotionType[] = ['1+1', '2+1'];

type ApplyStep = 'store' | 'product_info' | 'desired_contact' | 'complete';
export type RegistrationMethod = 'screenshot' | 'manual';

type RegistrationMethodSelectorProps = {
  value: RegistrationMethod | '';
  onChange: (value: RegistrationMethod) => void;
};

const REGISTRATION_METHODS = [
  {
    value: 'screenshot',
    label: '스크린샷으로 등록',
    description: '보관함에서 상품 화면을 이미지 1장으로 등록해요.',
  },
  {
    value: 'manual',
    label: '직접 입력하기',
    description: '상품명과 행사 당시 결제금액을 입력해요.',
  },
] as const;

type ScreenshotUploadProps = {
  file: File | null;
  onChange: (file: File | null) => void;
};

export function isScreenshotFile(file: File): boolean {
  return file.type.startsWith('image/');
}

export function ScreenshotUpload({ file, onChange }: ScreenshotUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(file);
    setPreviewUrl(nextPreviewUrl);
    return () => URL.revokeObjectURL(nextPreviewUrl);
  }, [file]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.currentTarget.files?.[0] ?? null;
    event.currentTarget.value = '';

    if (!nextFile) return;
    if (!isScreenshotFile(nextFile)) {
      setError('이미지 파일만 선택해주세요.');
      return;
    }

    setError(null);
    onChange(nextFile);
  };

  return (
    <div className="screenshot-upload">
      <input
        id="screenshot-file"
        className="screenshot-file-input"
        type="file"
        accept="image/*"
        aria-label="보관 상품 스크린샷"
        onChange={handleFileChange}
      />

      {!file ? (
        <label className="screenshot-upload-empty" htmlFor="screenshot-file">
          <span className="screenshot-upload-icon" aria-hidden="true">IMG</span>
          <strong className="screenshot-upload-title">이미지 1장 선택</strong>
          <span className="screenshot-upload-help">보관함에서 상품이 보이는 화면을 선택해주세요.</span>
        </label>
      ) : (
        <div className="screenshot-preview" aria-live="polite">
          <div className="screenshot-preview-image">
            {previewUrl ? (
              <img src={previewUrl} alt="선택한 보관 상품 스크린샷 미리보기" />
            ) : (
              <span role="status">미리보기 준비 중</span>
            )}
          </div>
          <div className="screenshot-preview-details">
            <strong>보관 상품 스크린샷</strong>
            <span className="screenshot-preview-name">{file.name}</span>
          </div>
        </div>
      )}

      {file && (
        <div className="screenshot-actions">
          <label className="btn btn-secondary" htmlFor="screenshot-file">이미지 교체</label>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => {
              setError(null);
              onChange(null);
            }}
          >
            삭제
          </button>
        </div>
      )}

      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
  );
}

export function RegistrationMethodSelector({
  value,
  onChange,
}: RegistrationMethodSelectorProps) {
  return (
    <fieldset className="form-group">
      <legend className="form-label" id="registration-method-label">등록 방식 선택</legend>
      <div className="choice-grid choice-grid-hero" role="radiogroup" aria-labelledby="registration-method-label">
        {REGISTRATION_METHODS.map((option) => (
          <label
            key={option.value}
            className={`choice-card choice-card-hero ${value === option.value ? 'is-selected' : ''}`}
          >
            <input
              type="radio"
              name="registrationMethod"
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <strong className="choice-hero-name">{option.label}</strong>
            <span className="choice-hero-desc">{option.description}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

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
  const [registrationMethod, setRegistrationMethod] = useState<RegistrationMethod | ''>('');

  // Step 2: Product Info & Desired Price
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [productName, setProductName] = useState('');
  const [originalPaidPrice, setOriginalPaidPrice] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [productErrors, setProductErrors] = useState<FieldErrors>({});
  const [savedProduct, setSavedProduct] = useState<ProductInfo | null>(null);
  const [desiredPrice, setDesiredPrice] = useState('');
  const [desiredPriceError, setDesiredPriceError] = useState<string | null>(null);

  // Step 3: Contact
  const [contactType, setContactType] = useState<ContactType | ''>('phone');
  const [contactValue, setContactValue] = useState('');
  const [contactErrors, setContactErrors] = useState<ContactFieldErrors>({});
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
      case 'desired_contact':
        setHeaderBack({ label: '← 뒤로가기', onClick: () => setCurrentStep('product_info') });
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

    const parsedPrice = desiredPriceSchema.safeParse({ desiredPrice });
    if (!parsedPrice.success) {
      setDesiredPriceError(fieldErrorsFromDesiredPriceZod(parsedPrice.error).desiredPrice ?? null);
      return;
    }
    setDesiredPriceError(null);

    if (registrationMethod === 'screenshot') {
      if (!screenshotFile || !store || !promotionType) {
        return;
      }
      setProductErrors({});
      setSavedProduct({
        store,
        promotionType,
        productName: '',
        originalPaidPrice: 0,
        quantity: 1,
        expiryDate: '',
      });
      setCurrentStep('desired_contact');
      return;
    }

    if (registrationMethod !== 'manual') return;

    const parsed = productInfoSchema.safeParse({
      store,
      promotionType,
      productName,
      originalPaidPrice,
      expiryDate,
    });

    if (!parsed.success) {
      setProductErrors(fieldErrorsFromZod(parsed.error));
      return;
    }

    setProductErrors({});
    setSavedProduct(parsed.data);
    setCurrentStep('desired_contact');
  };

  const handleApplySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!savedProduct || isSubmitting) return;

    const parsedPrice = desiredPriceSchema.safeParse({ desiredPrice });
    if (!parsedPrice.success) {
      setDesiredPriceError(fieldErrorsFromDesiredPriceZod(parsedPrice.error).desiredPrice ?? null);
      return;
    }

    const parsedContact = contactInfoSchema.safeParse({ contactType, contactValue });
    if (!parsedContact.success) {
      setContactErrors(fieldErrorsFromContactZod(parsedContact.error));
      return;
    }

    const contact: ContactInfo = parsedContact.data;
    const submittedMethod: 'SCREENSHOT' | 'MANUAL' =
      registrationMethod === 'screenshot' ? 'SCREENSHOT' : 'MANUAL';
    const unitBasePrice = calculateUnitBasePrice(
      savedProduct.originalPaidPrice,
      savedProduct.promotionType,
    );

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      let screenshotFileName: string | undefined;
      if (submittedMethod === 'SCREENSHOT') {
        if (!screenshotFile) {
          throw new Error('스크린샷을 선택해주세요.');
        }
        screenshotFileName = await uploadScreenshot(screenshotFile);
      }

      const newAppId = await submitApplication({
        store: savedProduct.store,
        promotionType: savedProduct.promotionType,
        registrationMethod: submittedMethod,
        screenshotFileName,
        productName: savedProduct.productName,
        originalPaidPrice: savedProduct.originalPaidPrice,
        quantity: savedProduct.quantity,
        expiryDate: savedProduct.expiryDate,
        desiredPrice: parsedPrice.data.desiredPrice,
        contactType: contact.contactType,
        contactValue: contact.contactValue,
      });

      // 신청 조회는 관리자 권한이 필요하므로(개인정보 RLS) 완료 화면은 제출 정보로 구성한다.
      setSubmittedApplication({
        id: newAppId,
        createdAt: new Date().toISOString(),
        store: savedProduct.store,
        promotionType: savedProduct.promotionType,
        registrationMethod: submittedMethod,
        screenshotFileName,
        productName: savedProduct.productName,
        originalPaidPrice: savedProduct.originalPaidPrice,
        quantity: savedProduct.quantity,
        expiryDate: savedProduct.expiryDate,
        unitBasePrice,
        desiredPrice: parsedPrice.data.desiredPrice,
        contactType: contact.contactType,
        contactValue: contact.contactValue,
        status: 'SUBMITTED',
      });
      setCurrentStep('complete');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (message === 'RECRUITMENT_NOT_OPEN') {
        setSubmitError('현재는 모집이 중단되어 판매 신청을 접수할 수 없습니다.');
      } else {
        // 운영 테스트 단계: 원인 파악을 위해 서버 오류 메시지를 그대로 노출한다.
        console.error('[apply] 판매 신청 제출 실패:', err);
        setSubmitError(
          message
            ? `신청 접수 실패: ${message}`
            : '신청 처리 중 오류가 발생했습니다. 다시 시도해주세요.',
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const parsedPaidPrice = Number(originalPaidPrice.replace(/\D/g, ''));
  const calculatedUnitPrice =
    registrationMethod === 'manual' && parsedPaidPrice > 0 && promotionType
      ? calculateUnitBasePrice(parsedPaidPrice, promotionType as PromotionType)
      : null;
  const desiredPricePlaceholder =
    calculatedUnitPrice !== null
      ? `예: ${calculatedUnitPrice.toLocaleString('ko-KR')}`
      : '예: 1500';

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
            <section className="wizard-step wizard-step-sticky-cta card" aria-labelledby="step-store-promotion-title">
              <StepProgressBar currentStep={1} totalSteps={3} stepTitle="편의점·행사 선택" />
              <div className="page-header">
                <h1 className="page-title" id="step-store-promotion-title">
                  편의점과 행사 유형을 선택해주세요
                </h1>
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
                    <legend className="form-label" id="promotion-label">행사 유형 선택</legend>
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
              <StepProgressBar currentStep={2} totalSteps={3} stepTitle="상품 정보 등록" tags={[store, promotionType]} />
              <div className="page-header">
                <h1 className="page-title">상품 정보를 등록해주세요</h1>
                <p className="page-desc">
                  등록 방식을 선택한 후 필요한 정보를 입력해주세요.
                </p>
              </div>

              <form className="apply-form" onSubmit={handleProductSubmit} noValidate>
                <RegistrationMethodSelector
                  value={registrationMethod}
                  onChange={setRegistrationMethod}
                />

                {registrationMethod === 'screenshot' && (
                  <div className="form-group">
                    <span className="form-label">보관 상품 스크린샷</span>
                    <ScreenshotUpload file={screenshotFile} onChange={setScreenshotFile} />
                    <span className="form-input-help">보관함에서 상품이 보이는 화면을 이미지 1장으로 등록해주세요.</span>
                  </div>
                )}

                {registrationMethod === 'manual' && (
                  <>
                    <div className="form-group">
                      <div className="form-label-row">
                        <label className="form-label" htmlFor="expiry-date">유효기간</label>
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
                      <div className="form-label-row">
                        <label className="form-label" htmlFor="product-name">상품명</label>
                        <span className="required-badge" aria-hidden="true">필수</span>
                      </div>
                  <input
                    id="product-name"
                    className="form-input"
                    type="text"
                    required
                    aria-required="true"
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

                    <div className="form-group">
                      <div className="form-label-row">
                        <label className="form-label" htmlFor="paid-price">
                          {promotionType ? `${promotionType} 행사 당시 실제 결제금액` : '행사 당시 실제 결제금액'}
                        </label>
                        <span className="required-badge" aria-hidden="true">필수</span>
                      </div>
                  <div className="input-with-unit">
                    <input
                      id="paid-price"
                      className="form-input"
                      type="text"
                      required
                      aria-required="true"
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
                  {calculatedUnitPrice !== null && promotionType && (
                        <span className="form-input-help is-calculated">
                          총 {parsedPaidPrice.toLocaleString('ko-KR')}원 기준 <strong>1개당 약 {calculatedUnitPrice.toLocaleString('ko-KR')}원</strong> ({parsedPaidPrice.toLocaleString('ko-KR')}원 ÷ {promotionType === '1+1' ? 2 : 3}개)
                        </span>
                      )}
                  {productErrors.originalPaidPrice !== undefined && (
                    <p className="form-error">{productErrors.originalPaidPrice}</p>
                  )}
                    </div>
                  </>
                )}

                <div className="form-group">
                  <div className="form-label-row">
                    <label className="form-label" htmlFor="desired-price">판매 희망금액</label>
                    <span className="required-badge" aria-hidden="true">필수</span>
                  </div>
                  <div className="input-with-unit">
                    <input
                      id="desired-price"
                      className="form-input"
                      type="text"
                      required
                      aria-required="true"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder={desiredPricePlaceholder}
                      value={desiredPrice}
                      onChange={(event) => {
                        setDesiredPrice(event.target.value);
                        setDesiredPriceError(null);
                      }}
                    />
                    <span className="input-unit">원</span>
                  </div>
                  <span className="form-input-help">판매 희망하시는 금액을 원 단위로 입력해주세요.</span>
                  {desiredPriceError !== null && (
                    <p className="form-error">{desiredPriceError}</p>
                  )}
                  {desiredPrice === '0' && (
                    <p className="form-input-help">0원은 무상 양도/처분 의향으로 기록돼요.</p>
                  )}
                </div>

                <div className="wizard-actions">
                  <button
                    type="submit"
                    className="btn btn-primary btn-lg btn-block"
                    disabled={
                      registrationMethod === '' ||
                      (registrationMethod === 'screenshot' && screenshotFile === null)
                    }
                  >
                    다음
                  </button>
                </div>
              </form>
            </section>
          )}

          {currentStep === 'desired_contact' && (
            <form className="apply-form card" onSubmit={handleApplySubmit} noValidate>
              <StepProgressBar
                currentStep={3}
                totalSteps={3}
                stepTitle="연락처"
                tags={[store, promotionType]}
              />
              <div className="page-header">
                <h1 className="page-title">연락처를 알려주세요</h1>
                <p className="page-desc">
                  판매 신청을 남겨주시면<br />
                  입력하신 연락처로 증빙과 QR 전달 방법을 안내드릴게요.
                </p>
              </div>

              <fieldset className="form-group form-group-contact">
                <legend className="form-label form-label-row" id="contact-type-label">
                  <span>연락 수단 종류</span>
                  <span className="required-badge" aria-hidden="true">필수</span>
                </legend>
                <div className="choice-grid" role="radiogroup" aria-label="연락 수단 종류">
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
                <div className="form-label-row">
                  <label className="form-label" htmlFor="contact-value">
                    {contactType === 'kakao' ? '카카오톡 ID 또는 오픈채팅 링크' : '휴대전화 번호'}
                  </label>
                  <span className="required-badge" aria-hidden="true">필수</span>
                </div>
                <input
                  id="contact-value"
                  className="form-input"
                  type={contactType === 'phone' ? 'tel' : 'text'}
                  required
                  aria-required="true"
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
                    ? '구매 진행을 위해 카카오톡으로 진행 방법 설명 후 구매 진행합니다'
                    : '구매 진행을 위해 번호로 문자로 진행 방법 설명 후 구매 진행합니다'}
                </span>
              </div>

              {submitError && (
                <div className="status-notice status-notice-closed" role="alert">
                  <strong className="status-notice-title">{submitError}</strong>
                </div>
              )}

              <div className="wizard-actions">
                <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={isSubmitting}>
                  {isSubmitting ? '신청 처리 중...' : '판매 신청하기'}
                </button>
              </div>
            </form>
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
                  입력하신 연락처로 구매 진행을 할게요!
                </p>
              </div>

              <div className="complete-notice-box">
                <h2 className="complete-notice-title">이후 진행 안내</h2>
                <ul className="complete-notice-list">
                  <li><strong>신청 접수</strong>가 완료되었어요.</li>
                  <li>입력하신 연락처({submittedApplication.contactValue})로 <strong>구매 진행하겠습니다.</strong></li>
                </ul>
              </div>

              <div className="complete-summary">
                <h2 className="complete-summary-title">신청 내역 요약</h2>
                <dl className="complete-summary-dl">
                  <div>
                    <dt>상품</dt>
                    <dd>
                      {submittedApplication.store} ·{' '}
                      {submittedApplication.registrationMethod === 'SCREENSHOT'
                        ? '스크린샷 등록'
                        : submittedApplication.productName}
                      {' '}({submittedApplication.quantity}개)
                    </dd>
                  </div>
                  <div>
                    <dt>판매 희망금액</dt>
                    <dd>
                      <strong>{submittedApplication.desiredPrice.toLocaleString('ko-KR')}원</strong>
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

    </div>
  );
}
