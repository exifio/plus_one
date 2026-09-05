import StepReview from './StepReview';

export default function StepReviewSheet({
  isOpen,
  onClose,
  draft,
  onGoStep,
  onSubmit,
  submitState,
}) {
  if (!isOpen) return null;

  return (
    <div
      className="review-sheet-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-sheet-title"
    >
      <div className="review-sheet" onClick={(e) => e.stopPropagation()}>
        <header className="review-sheet-head">
          <h2 id="review-sheet-title" className="review-sheet-title">
            판매 신청 내용 확인
          </h2>
          <button
            type="button"
            className="review-sheet-close"
            onClick={onClose}
            aria-label="닫기"
          >
            ×
          </button>
        </header>

        <div className="review-sheet-body">
          <StepReview draft={draft} onGoStep={onGoStep} embedded />
        </div>

        {submitState?.error && (
          <p className="submit-error">{submitState.error}</p>
        )}

        <footer className="review-sheet-footer">
          <button
            type="button"
            className="btn-primary"
            disabled={submitState?.busy}
            onClick={onSubmit}
          >
            {submitState?.busy ? '신청 중…' : '판매 신청하기'}
          </button>
        </footer>
      </div>
    </div>
  );
}
