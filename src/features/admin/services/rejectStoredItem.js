/**
 * StoredItem 거절 처리 Service.
 *
 * TESTING §17의 규칙을 조율한다.
 *
 * ```text
 * 거절 이유 확인
 * ↓
 * Admin API 호출 (purchase_evidence 없이)
 * ```
 *
 * 거절 이유가 없으면 요청하지 않는다.
 *
 * @param {object} deps
 * @param {object} deps.adminApi FE-4 Admin API 계약
 */
export function createRejectStoredItemService({ adminApi }) {
  return async function rejectStoredItem(storedItemId, rejectionReason) {
    if (!rejectionReason || !String(rejectionReason ?? '').trim()) {
      return { ok: false, error: 'validation' };
    }

    try {
      const status = await adminApi.rejectStoredItem(storedItemId, rejectionReason);
      return { ok: true, data: { status } };
    } catch {
      return { ok: false, error: 'submit' };
    }
  };
}