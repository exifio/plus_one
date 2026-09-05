import { useReducer, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  createInitialSaleRequestDraft,
  saleRequestReducer,
} from '../../sale-request/state/saleRequestReducer';
import { validateStoredItem } from '../../sale-request/domain/validateStoredItem';
import { getKoreanTodayString } from '../../sale-request/domain/getKoreanTodayString';
import { createSubmitSaleRequestService } from '../services/submitSaleRequest';
import { useServer } from '../../server/ServerContext';
import { useRecruitmentStatus } from '../../recruitment/useRecruitmentStatus';
import RecruitmentNotice from '../../recruitment/components/RecruitmentNotice';
import { isValidPhoneNumber } from '../utils/format';
import StepStore from '../components/sell-flow/StepStore';
import StepItems from '../components/sell-flow/StepItems';
import StepContact from '../components/sell-flow/StepContact';
import StepReview from '../components/sell-flow/StepReview';
import StepReviewSheet from '../components/sell-flow/StepReviewSheet';

const TOTAL_STEPS = 3;
const NEXT_LABELS = {
  1: '상품 등록하기',
  2: '연락처 입력하기',
  3: '신청 내용 확인하기',
};

export default function SellPage() {
  const { saleRequestApi, storageApi } = useServer();
  // /sell 직접 접근 보호: 진입 시 모집 상태를 확인한다. (명세 §12)
  const recruitment = useRecruitmentStatus(saleRequestApi);
  // 이미 Form을 열어둔 사이 모집이 중단/마감된 경우 제출 시점에 다시 차단한다. (명세 §13)
  const [submitBlockedBy, setSubmitBlockedBy] = useState(null);

  const [draft, dispatch] = useReducer(
    saleRequestReducer,
    undefined,
    createInitialSaleRequestDraft,
  );
  const [step, setStep] = useState(1);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [submitState, setSubmitState] = useState({ busy: false, error: null });
  const navigate = useNavigate();
  const today = getKoreanTodayString();

  const goNext = () => {
    if (step === TOTAL_STEPS) {
      setIsReviewOpen(true);
      return;
    }
    setStep((current) => Math.min(current + 1, TOTAL_STEPS));
  };
  const goBack = () => {
    if (step === 1) {
      navigate('/');
      return;
    }
    setStep((current) => Math.max(current - 1, 1));
  };
  const goStep = (target) => {
    setStep(target);
    setIsReviewOpen(false);
  };

  const canGoNext = (() => {
    if (step === 1) return Boolean(draft.convenienceStore && draft.promotionType);
    if (step === 2) {
      if (draft.registrationMethod === 'screenshot') return Boolean(draft.evidenceImage);
      if (draft.registrationMethod === 'manual') {
        return draft.items.every((item) => validateStoredItem(item, today).valid);
      }
      return false;
    }
    if (step === 3) {
      if (!draft.contactType) return false;
      const trimmed = String(draft.contactValue ?? '').trim();
      if (!trimmed) return false;
      if (draft.contactType === 'phone') {
        return isValidPhoneNumber(trimmed);
      }
      return Boolean(trimmed);
    }
    return false;
  })();

  const handleSubmit = async () => {
    setSubmitState({ busy: true, error: null });
    const service = createSubmitSaleRequestService({ storageApi, saleRequestApi, today });
    const result = await service(draft);

    if (!result.ok) {
      // Backend가 모집 중단/마감을 반환한 경우: 최신 상태를 확인해 안내 화면으로 전환한다.
      // 완료 화면으로 이동하지 않는다. (명세 §13, §20)
      if (result.error === 'recruitment') {
        let latest;
        try {
          latest = (await saleRequestApi.getRecruitmentStatus()).status;
        } catch {
          latest = undefined;
        }

        if (latest === 'paused' || latest === 'closed') {
          setSubmitBlockedBy(latest);
          setSubmitState({ busy: false, error: null });
          return;
        }
        if (latest === undefined) {
          setSubmitBlockedBy('error');
          setSubmitState({ busy: false, error: null });
          return;
        }
      }

      setSubmitState({
        busy: false,
        error: '판매 신청 제출에 실패했어요. 잠시 후 다시 시도해주세요.',
      });
      return;
    }
    navigate('/sell/complete');
  };

  // 화면 분기: loading → error → blocked(paused/closed) → open
  let view = 'open';
  if (submitBlockedBy) {
    view = submitBlockedBy;
  } else if (recruitment.loading) {
    view = 'loading';
  } else if (recruitment.error) {
    view = 'error';
  } else if (recruitment.status !== 'open') {
    view = recruitment.status;
  }

  if (view === 'loading') {
    return (
      <div className="sell-page">
        <main className="sell-main">
          <p className="recruitment-notice-desc">불러오는 중…</p>
        </main>
      </div>
    );
  }

  if (view !== 'open') {
    return (
      <div className="sell-page">
        <header className="sell-header">
          <span className="brand-logo">
            <span className="brand-logo-plus">+</span>
            <span className="brand-logo-num">1</span>
          </span>
        </header>
        <main className="sell-main">
          <RecruitmentNotice status={view}>
            <span className="recruitment-notice-action">
              <Link to="/" className="btn-secondary">
                홈으로
              </Link>
            </span>
          </RecruitmentNotice>
        </main>
      </div>
    );
  }

  return (
    <div className="sell-page">
      <header className="sell-header">
        <button type="button" className="back-button" onClick={goBack} aria-label="이전 단계">
          ←
        </button>
        <span className="brand-logo">
          <span className="brand-logo-plus">+</span>
          <span className="brand-logo-num">1</span>
        </span>
        <span className="step-count">{step} / {TOTAL_STEPS}</span>
      </header>

      <div className="step-progress" aria-hidden="true">
        <div
          className="step-progress-fill"
          style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
        />
      </div>

      <main className="sell-main">
        {step === 1 && <StepStore draft={draft} dispatch={dispatch} />}
        {step === 2 && <StepItems draft={draft} dispatch={dispatch} today={today} />}
        {step === 3 && <StepContact draft={draft} dispatch={dispatch} />}
        {/* 되돌리기 지원: 4단계 단독 페이지 복원 시 TOTAL_STEPS = 4 및 아래 활성화 */}
        {step === 4 && <StepReview draft={draft} onGoStep={goStep} />}

        {submitState.error && <p className="submit-error">{submitState.error}</p>}
      </main>

      <footer className="cta-bar">
        <button
          type="button"
          className="btn-primary"
          disabled={!canGoNext}
          onClick={goNext}
        >
          {NEXT_LABELS[step]}
        </button>
      </footer>

      <StepReviewSheet
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        draft={draft}
        onGoStep={goStep}
        onSubmit={handleSubmit}
        submitState={submitState}
      />
    </div>
  );
}
