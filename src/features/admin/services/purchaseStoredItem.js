/**
 * StoredItem 구매 처리 Service.
 *
 * TESTING §16의 실행 순서를 조율한다.
 *
 * ```text
 * 구매 증빙 확인
 * ↓
 * 구매 증빙 Upload
 * ↓
 * Admin API 호출
 * ```
 *
 * 증빙이 없으면 요청하지 않고, 업로드가 실패하면 Admin API를 호출하지 않는다.
 *
 * @param {object} deps
 * @param {object} deps.storageApi { uploadPurchaseEvidence(image) → path }
 * @param {object} deps.adminApi FE-4 Admin API 계약
 */
export function createPurchaseStoredItemService({ storageApi, adminApi }) {
  return async function purchaseStoredItem(storedItemId, purchaseEvidence) {
    if (!purchaseEvidence) {
      return { ok: false, error: 'validation' };
    }

    let evidencePath;
    try {
      evidencePath = await storageApi.uploadPurchaseEvidence(purchaseEvidence);
    } catch {
      return { ok: false, error: 'upload' };
    }

    try {
      const status = await adminApi.purchaseStoredItem(storedItemId, evidencePath);
      return { ok: true, data: { status } };
    } catch {
      return { ok: false, error: 'submit' };
    }
  };
}