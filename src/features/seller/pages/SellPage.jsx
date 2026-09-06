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
import StepEvidence from '../components/sell-flow/StepEvidence';
import StepContact from '../components/sell-flow/StepContact';

const TOTAL_STEPS = 3;
const NEXT_LABELS = {
  1: '상품 등록하기',
  2: '연락처 입력하기',
  3: '판매 신청하기',
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
  const [submitState, setSubmitState] = useState({ busy: false, error: null });
  const navigate = useNavigate();
  const today = getKoreanTodayString();

  const goNext = () => {
    if (step === TOTAL_STEPS) {
      if (!submitState.busy) handleSubmit();
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
  const canGoNext = (() => {
    if (step === 1) return Boolean(draft.convenienceStore && draft.promotionType);
    if (step === 2) {
      if (!['screenshot', 'manual'].includes(draft.registrationMethod)) return false;
      return draft.items.length > 0
        && draft.items.every((item) => (
          validateStoredItem(item, today, draft.registrationMethod).valid
        ))
        && (draft.registrationMethod !== 'screenshot' || Boolean(draft.evidenceImage));
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
    if (submitState.busy) return;
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
          <Link to="/" className="brand-logo" aria-label="홈으로 이동">
            <span className="brand-logo-plus">+</span>
            <span className="brand-logo-num">1</span>
          </Link>
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
        <Link to="/" className="brand-logo" aria-label="홈으로 이동">
          <span className="brand-logo-plus">+</span>
          <span className="brand-logo-num">1</span>
        </Link>
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
        {step === 2 && (
          <StepItems draft={draft} dispatch={dispatch} today={today}>
            {draft.registrationMethod === 'screenshot' && (
              <StepEvidence draft={draft} dispatch={dispatch} />
            )}
          </StepItems>
        )}
        {step === 3 && <StepContact draft={draft} dispatch={dispatch} />}

        {submitState.error && <p className="submit-error">{submitState.error}</p>}
      </main>

      <footer className="cta-bar">
        <button
          type="button"
          className="btn-primary"
          disabled={!canGoNext || submitState.busy}
          onClick={goNext}
        >
          {submitState.busy ? '신청 중…' : NEXT_LABELS[step]}
        </button>
      </footer>
    </div>
  );
}
