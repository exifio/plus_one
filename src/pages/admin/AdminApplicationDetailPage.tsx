import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getApplicationById } from '../../mocks/applicationsStore';
import {
  fetchApplicationById,
  updateApplicationStatus as svcUpdateApplicationStatus,
  SCREENSHOT_STORAGE_BUCKET,
} from '../../services/applicationService';
import { isSupabaseConfigured, supabase } from '../../services/supabaseClient';
import {
  STATUS_FILTERS,
  STATUS_LABELS,
  REGISTRATION_METHOD_LABELS,
  formatWon,
  formatDateTime,
  statusBadgeClass,
} from '../../utils/adminStatus';
import { calculateDesiredRatio } from '../../utils/price';
import type { ApplicationStatus } from '../../types';
import type { Application } from '../../types';

const CONTACT_TYPE_LABELS: Record<'phone' | 'kakao', string> = {
  phone: '휴대전화',
  kakao: '카카오톡',
};

export const AdminApplicationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [application, setApplication] = useState<Application | undefined>(() =>
    id && !isSupabaseConfigured ? getApplicationById(id) : undefined,
  );
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [status, setStatus] = useState<ApplicationStatus>(
    application?.status ?? 'SUBMITTED',
  );
  const [saved, setSaved] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setApplication(undefined);
      setIsLoading(false);
      return;
    }

    if (!isSupabaseConfigured) {
      setApplication(getApplicationById(id));
      setIsLoading(false);
      return;
    }

    let active = true;
    setIsLoading(true);
    setLoadError(null);
    fetchApplicationById(id)
      .then((nextApplication) => {
        if (active) {
          setApplication(nextApplication ?? undefined);
        }
      })
      .catch(() => {
        if (active) {
          setLoadError('신청 상세를 불러오지 못했어요. 잠시 후 다시 시도해주세요.');
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (application) {
      setStatus(application.status);
    }
  }, [application]);

  // 스크린샷 원본은 private Storage이므로 관리자 세션의 signed URL로만 조회한다.
  useEffect(() => {
    setScreenshotUrl(null);
    if (
      !supabase ||
      application?.registrationMethod !== 'SCREENSHOT' ||
      !application.screenshotFileName
    ) {
      return;
    }

    let active = true;
    supabase.storage
      .from(SCREENSHOT_STORAGE_BUCKET)
      .createSignedUrl(application.screenshotFileName, 600)
      .then(({ data }) => {
        if (active && data?.signedUrl) {
          setScreenshotUrl(data.signedUrl);
        }
      })
      .catch(() => {
        if (active) {
          setScreenshotUrl(null);
        }
      });

    return () => {
      active = false;
    };
  }, [application]);

  if (isLoading) {
    return (
      <div className="admin-detail-page">
        <div className="card admin-empty-card">신청 상세를 불러오고 있어요.</div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="admin-detail-page">
        <div className="card admin-empty-card" role="alert">{loadError}</div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="admin-detail-page">
        <div className="card admin-empty-card">
          <p>요청하신 신청을 찾을 수 없어요.</p>
          <Link to="/admin" className="btn btn-secondary">
            신청 목록으로
          </Link>
        </div>
      </div>
    );
  }

  const handleSave = async (next: ApplicationStatus) => {
    if (isSaving) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      await svcUpdateApplicationStatus(application.id, next);
      setStatus(next);
      setApplication((current) => (current ? { ...current, status: next } : current));
      setSaved(true);
    } catch {
      setSaveError('상태를 저장하지 못했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = (textToCopy: string, key: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(textToCopy).catch(() => {});
    }
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  const applicationLabel = application.registrationMethod === 'SCREENSHOT'
    ? REGISTRATION_METHOD_LABELS.SCREENSHOT
    : application.productName;
  const proceedTemplate = `[+1] 안녕하세요! 신청해주신 '${applicationLabel}' 건 판매 진행 가능하여 연락드립니다.\n보관함의 상품 바코드/QR 캡처본을 회신해주시면 확인 즉시 ${formatWon(application.desiredPrice)}을 토스/카카오페이로 입금해 드립니다.`;
  const cancelTemplate = `[+1] 안녕하세요! 신청해주신 '${applicationLabel}' 건은 현재 매입 수량 마감으로 아쉽게도 이번 거래 진행이 어렵게 되었습니다.\n신청해주셔서 감사드리며 더 좋은 서비스로 찾아뵙겠습니다.`;
  const completedTemplate = `[+1] 안녕하세요! '${applicationLabel}' 건의 판매 대금 ${formatWon(application.desiredPrice)} 입금이 완료되었습니다.\n이용해주셔서 감사합니다!`;

  const desiredRatio = application.registrationMethod === 'MANUAL'
    ? calculateDesiredRatio(application.unitBasePrice, application.desiredPrice)
    : null;

  return (
    <div className="admin-detail-page">
      <div className="admin-page-header admin-detail-header">
        <Link to="/admin" className="detail-back-link">
          ← 목록으로
        </Link>
        <div className="admin-detail-title-row">
          <h1 className="admin-page-title">{applicationLabel}</h1>
          <span className={statusBadgeClass(status)}>{STATUS_LABELS[status]}</span>
        </div>
        <p className="admin-page-subtitle">
          신청번호 {application.id} · {formatDateTime(application.createdAt)} 접수
        </p>
      </div>

      {saved && (
        <div className="status-saved-banner" role="status">
          상태가 ‘{STATUS_LABELS[status]}’(으)로 변경되었어요.
        </div>
      )}

      {saveError && (
        <div className="status-notice status-notice-closed" role="alert">
          <strong className="status-notice-title">{saveError}</strong>
        </div>
      )}

      <section className="detail-card">
        <h2 className="detail-section-title">신청 정보</h2>
        <dl className="detail-grid">
          <div className="detail-item">
            <dt>편의점</dt>
            <dd>{application.store}</dd>
          </div>
          <div className="detail-item">
            <dt>행사 유형</dt>
            <dd>{application.promotionType}</dd>
          </div>
          <div className="detail-item">
            <dt>등록 방식</dt>
            <dd>
              <span
                className={`registration-method registration-method-${application.registrationMethod.toLowerCase()}`}
                data-registration-method={application.registrationMethod}
              >
                {REGISTRATION_METHOD_LABELS[application.registrationMethod]}
              </span>
            </dd>
          </div>
          <div className="detail-item">
            <dt>판매 희망 수량</dt>
            <dd>{application.quantity}개</dd>
          </div>
        </dl>
      </section>

      {application.registrationMethod === 'SCREENSHOT' ? (
        <section className="detail-card">
          <h2 className="detail-section-title">등록한 스크린샷</h2>
          <div
            className="detail-screenshot-preview"
            role="img"
            aria-label="업로드한 보관상품 스크린샷 미리보기"
          >
            {screenshotUrl ? (
              <img
                className="detail-screenshot-image"
                src={screenshotUrl}
                alt="업로드한 보관상품 스크린샷"
              />
            ) : (
              <>
                <span className="detail-screenshot-preview-badge" aria-hidden="true">IMG</span>
                <strong>보관 상품 스크린샷</strong>
              </>
            )}
          </div>
          <p className="detail-hint">
            파일명: {application.screenshotFileName ?? '스크린샷 파일명 없음'}
          </p>
        </section>
      ) : (
        <section className="detail-card">
          <h2 className="detail-section-title">직접 입력 정보</h2>
          <dl className="detail-grid">
            <div className="detail-item">
              <dt>상품명</dt>
              <dd>{application.productName}</dd>
            </div>
            <div className="detail-item">
              <dt>실제 결제금액</dt>
              <dd>{formatWon(application.originalPaidPrice)}</dd>
            </div>
            <div className="detail-item">
              <dt>소비기한 / 유효기간</dt>
              <dd>{application.expiryDate || '미입력'}</dd>
            </div>
            <div className="detail-item">
              <dt>행사 기준 1개 가격</dt>
              <dd>{formatWon(application.unitBasePrice)}</dd>
            </div>
          </dl>
        </section>
      )}

      <section className="detail-card">
        <h2 className="detail-section-title">판매 희망금액</h2>
        <dl className="detail-grid">
          <div className="detail-item">
            <dt>판매 희망금액 (1개당)</dt>
            <dd>{formatWon(application.desiredPrice)}</dd>
          </div>
          {desiredRatio !== null && (
            <div className="detail-item">
              <dt>희망가격 비율 (분석용)</dt>
              <dd>{desiredRatio}%</dd>
            </div>
          )}
        </dl>
      </section>

      <section className="detail-card">
        <h2 className="detail-section-title">연락 수단</h2>
        <dl className="detail-grid">
          <div className="detail-item">
            <dt>연락 종류</dt>
            <dd>{CONTACT_TYPE_LABELS[application.contactType]}</dd>
          </div>
          <div className="detail-item">
            <dt>연락 정보</dt>
            <dd className="detail-contact-value">{application.contactValue}</dd>
          </div>
        </dl>
      </section>

      <section className="detail-card">
        <h2 className="detail-section-title">안내 메시지 템플릿</h2>
        <p className="detail-hint">
          판매자에게 보낼 문자를 클릭 한 번으로 복사하여 문자/카카오톡으로 발송할 수 있어요.
        </p>
        <div className="template-list">
          <div className="template-item">
            <div className="template-header">
              <span className="template-tag">1. 판매 진행 / QR 요청</span>
              <button
                type="button"
                className={`btn-template-copy ${copiedKey === 'proceed' ? 'is-copied' : ''}`}
                onClick={() => handleCopy(proceedTemplate, 'proceed')}
              >
                {copiedKey === 'proceed' ? '복사됨!' : '문구 복사'}
              </button>
            </div>
            <p className="template-text">{proceedTemplate}</p>
          </div>

          <div className="template-item">
            <div className="template-header">
              <span className="template-tag">2. 매입 불가 / 취소 안내</span>
              <button
                type="button"
                className={`btn-template-copy ${copiedKey === 'cancel' ? 'is-copied' : ''}`}
                onClick={() => handleCopy(cancelTemplate, 'cancel')}
              >
                {copiedKey === 'cancel' ? '복사됨!' : '문구 복사'}
              </button>
            </div>
            <p className="template-text">{cancelTemplate}</p>
          </div>

          <div className="template-item">
            <div className="template-header">
              <span className="template-tag">3. 입금 완료 안내</span>
              <button
                type="button"
                className={`btn-template-copy ${copiedKey === 'completed' ? 'is-copied' : ''}`}
                onClick={() => handleCopy(completedTemplate, 'completed')}
              >
                {copiedKey === 'completed' ? '복사됨!' : '문구 복사'}
              </button>
            </div>
            <p className="template-text">{completedTemplate}</p>
          </div>
        </div>
      </section>

      <section className="detail-card">
        <h2 className="detail-section-title">상태 변경</h2>
        <p className="detail-hint">
          진행 상황에 맞춰 상태를 선택하고 저장하세요. ‘매입 안 함’과 ‘진행 실패’는 구분해 기록합니다.
        </p>
        <div className="status-select-grid" role="radiogroup" aria-label="신청 상태 변경">
          {STATUS_FILTERS.filter((option) => option.value !== 'ALL').map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={status === option.value}
              className={status === option.value ? 'status-option is-active' : 'status-option'}
              onClick={() => void handleSave(option.value as ApplicationStatus)}
              disabled={isSaving}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};
