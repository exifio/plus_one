import { getRecruitmentStatusInfo } from '../../recruitment/domain/recruitmentStatus';

/**
 * 신규 판매 신청을 차단하는 방향의 변경 확인 Dialog. (명세 §10)
 *
 * 기존 ActionModal의 modal-sheet / btn-secondary / btn-primary 패턴을 재사용한다.
 * 새로운 복잡한 Confirmation 시스템은 만들지 않는다.
 */
export default function RecruitmentConfirmModal({ status, busy, onCancel, onConfirm }) {
  const info = getRecruitmentStatusInfo(status);

  const texts = {
    paused: {
      title: '판매 신청 접수를 일시중지할까요?',
      description: '변경 즉시 새로운 판매 신청을 받을 수 없게 됩니다.',
    },
    closed: {
      title: '판매자 모집을 마감할까요?',
      description: '변경 즉시 새로운 판매 신청을 받을 수 없게 됩니다.',
    },
  };
  const text = texts[status];
  if (!text) return null;

  return (
    <div className="modal-backdrop" onClick={busy ? undefined : onCancel}>
      <div
        className="modal-sheet"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="modal-title">{text.title}</h3>
        <p className="recruitment-confirm-desc">{text.description}</p>
        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>
            취소
          </button>
          <button type="button" className="btn-primary" onClick={onConfirm} disabled={busy}>
            {busy ? '저장 중…' : info.label}
          </button>
        </div>
      </div>
    </div>
  );
}
