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
            <dd>{application.expiryDate}</dd>
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
