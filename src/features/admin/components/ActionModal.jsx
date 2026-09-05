import { useState } from 'react';
import { createPurchaseStoredItemService } from '../services/purchaseStoredItem';
import { createRejectStoredItemService } from '../services/rejectStoredItem';

export default function ActionModal({ modal, onClose, onDone, adminApi, storageApi }) {
  const { type, item } = modal;
  const [purchaseEvidence, setPurchaseEvidence] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    setBusy(true);
    setError(null);

    const result = type === 'purchase'
      ? await createPurchaseStoredItemService({ storageApi, adminApi })(
          item.stored_item_id,
          purchaseEvidence,
        )
      : await createRejectStoredItemService({ adminApi })(
          item.stored_item_id,
          rejectionReason,
        );

    if (!result.ok) {
      setBusy(false);
      setError(
        result.error === 'validation'
          ? '필수 항목을 입력해주세요.'
          : '처리에 실패했어요. 다시 시도해주세요.',
      );
      return;
    }

    onClose();
    onDone();
  };

  const canSubmit = type === 'purchase'
    ? Boolean(purchaseEvidence)
    : Boolean(String(rejectionReason ?? '').trim());

  return (
    <div className="modal-backdrop" onClick={busy ? undefined : onClose}>
      <div className="modal-sheet" onClick={(event) => event.stopPropagation()}>
        <h3 className="modal-title">
          {type === 'purchase' ? '이 상품을 구매 처리할까요?' : '거절 이유를 입력해주세요'}
        </h3>

        {type === 'purchase' ? (
          <label className="admin-upload">
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(event) => setPurchaseEvidence(event.target.files?.[0] ?? null)}
            />
            {purchaseEvidence ? (
              <span className="admin-upload-value">{purchaseEvidence.name} ✓</span>
            ) : (
              <span className="admin-upload-empty">구매 증빙 이미지 선택</span>
            )}
          </label>
        ) : (
          <textarea
            className="textarea-input"
            placeholder="거절 이유를 입력해주세요"
            value={rejectionReason}
            onChange={(event) => setRejectionReason(event.target.value)}
          />
        )}

        {error && <p className="field-error">{error}</p>}

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>
            취소
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleSubmit}
            disabled={busy || !canSubmit}
          >
            {busy ? '처리 중…' : type === 'purchase' ? '구매 처리' : '거절 처리'}
          </button>
        </div>
      </div>
    </div>
  );
}