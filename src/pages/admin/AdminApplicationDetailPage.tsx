import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getApplicationById, updateApplicationStatus } from '../../mocks/applicationsStore';
import {
  STATUS_FILTERS,
  STATUS_LABELS,
  formatWon,
  formatDateTime,
  statusBadgeClass,
} from '../../utils/adminStatus';
import type { ApplicationStatus } from '../../types';

const CONTACT_TYPE_LABELS: Record<'phone' | 'kakao', string> = {
  phone: '휴대전화',
  kakao: '카카오톡',
};

export const AdminApplicationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const application = id ? getApplicationById(id) : undefined;

  const [status, setStatus] = useState<ApplicationStatus>(
    application?.status ?? 'SUBMITTED',
  );
  const [saved, setSaved] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

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

  const handleSave = (next: ApplicationStatus) => {
    setStatus(next);
    updateApplicationStatus(application.id, next);
    setSaved(true);
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

  const proceedTemplate = `[+1] 안녕하세요! 신청해주신 '${application.productName}' 건 판매 진행 가능하여 연락드립니다.\n보관함의 상품 바코드/QR 캡처본을 회신해주시면 확인 즉시 ${formatWon(application.finalPrice)}을 토스/카카오페이로 입금해 드립니다.`;
  const cancelTemplate = `[+1] 안녕하세요! 신청해주신 '${application.productName}' 건은 현재 매입 수량 마감으로 아쉽게도 이번 거래 진행이 어렵게 되었습니다.\n신청해주셔서 감사드리며 더 좋은 서비스로 찾아뵙겠습니다.`;
  const completedTemplate = `[+1] 안녕하세요! '${application.productName}' 건의 판매 대금 ${formatWon(application.finalPrice)} 입금이 완료되었습니다.\n이용해주셔서 감사합니다!`;

  const priceChanged = application.initialPrice !== application.finalPrice;

  return (
    <div className="admin-detail-page">
      <div className="admin-page-header admin-detail-header">
        <Link to="/admin" className="detail-back-link">
          ← 목록으로
        </Link>
        <div className="admin-detail-title-row">
          <h1 className="admin-page-title">{application.productName}</h1>
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
            <dt>상품명</dt>
            <dd>{application.productName}</dd>
          </div>
          <div className="detail-item">
            <dt>실제 결제금액</dt>
            <dd>{formatWon(application.originalPaidPrice)}</dd>
          </div>
          <div className="detail-item">
            <dt>판매 희망 수량</dt>
            <dd>{application.quantity}개</dd>
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

      <section className="detail-card">
        <h2 className="detail-section-title">가격 결정 내역</h2>
        <dl className="detail-grid">
          <div className="detail-item">
            <dt>최초 비율 / 금액</dt>
            <dd>
              {application.initialRatio}% · {formatWon(application.initialPrice)}
            </dd>
          </div>
          <div className="detail-item">
            <dt>가격 제안 여부</dt>
            <dd>{application.hadPriceOffer ? '제안함' : '제안 없음'}</dd>
          </div>
          {application.hadPriceOffer && (
            <div className="detail-item">
              <dt>제안 비율 / 금액</dt>
              <dd>
                {application.offeredRatio}% · {formatWon(application.offeredPrice ?? 0)}
              </dd>
            </div>
          )}
          {application.hadPriceOffer && (
            <div className="detail-item">
              <dt>제안 수락 여부</dt>
              <dd>{application.offerAccepted ? '수락' : '거절'}</dd>
            </div>
          )}
          <div className="detail-item">
            <dt>최종 비율 / 금액</dt>
            <dd>
              {application.finalRatio}% · {formatWon(application.finalPrice)}
              {priceChanged && (
                <span className="detail-note">
                  (최초 {formatWon(application.initialPrice)} → 변경)
                </span>
              )}
            </dd>
          </div>
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
              onClick={() => handleSave(option.value as ApplicationStatus)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};
