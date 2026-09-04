import React from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import type { SellerLayoutContext } from '../../layouts/SellerLayout';

export const LandingPage: React.FC = () => {
  const outletContext = useOutletContext<SellerLayoutContext | undefined>();
  const status = outletContext?.recruitmentStatus ?? 'OPEN';
  const isLoading = outletContext !== undefined && outletContext.recruitmentStatus === null;
  const canApply = !isLoading && !outletContext?.recruitmentError && status === 'OPEN';

  return (
    <div className="landing-page">
      <section className="hero-section">
        <div className="hero-badge">GS25 · CU 보관상품 판매</div>
        <h1 className="hero-title">
          남은 1+1 보관상품,<br />
          원하는 가격에 판매해보세요
        </h1>
        <p className="hero-subtitle">
          더 이상 안 쓰는 나만의 냉장고/포켓CU 보관상품을<br />
          간편하게 신청하고 판매를 진행할 수 있습니다.
        </p>

        {outletContext?.recruitmentError && (
          <div className="status-notice status-notice-closed" role="alert">
            <strong className="status-notice-title">신청 가능 여부를 확인하지 못했어요</strong>
            <p className="status-notice-desc">잠시 후 다시 확인해주세요.</p>
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
      </section>

      <section className="guide-card">
        <h2 className="guide-title">어떻게 진행되나요?</h2>
        <ol className="guide-steps">
          <li className="guide-step-item">
            <span className="step-num">1</span>
            <div className="step-info">
              <strong>편의점·행사 선택</strong>
              <p>어떤 편의점에서 어떤 행사로 구입하셨는지 확인해요.</p>
            </div>
          </li>
          <li className="guide-step-item">
            <span className="step-num">2</span>
            <div className="step-info">
              <strong>상품 정보 등록</strong>
              <p>스크린샷을 올리거나 직접 상품 정보를 입력해요.</p>
            </div>
          </li>
          <li className="guide-step-item">
            <span className="step-num">3</span>
            <div className="step-info">
              <strong>연락처 입력</strong>
              <p>연락처를 남기시면 판매가 진행됩니다</p>
            </div>
          </li>
        </ol>
      </section>

      {canApply && (
        <div className="hero-actions hero-cta-desktop">
          <Link to="/apply" className="btn btn-primary btn-lg">
            판매 신청하기
          </Link>
        </div>
      )}

      {canApply && (
        <div className="sticky-cta-bar">
          <Link to="/apply" className="btn btn-primary btn-lg btn-block">
            판매 신청하기
          </Link>
        </div>
      )}
    </div>
  );
};
