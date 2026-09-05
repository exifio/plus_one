export function validateStoredItemResult({ result, purchaseEvidence, rejectionReason }) {
  if (result === 'pending') {
    const valid = !purchaseEvidence && !rejectionReason;
    return { valid, message: valid ? null : '미처리 상품에는 처리 정보가 없어야 합니다.' };
  }

  if (result === 'purchased') {
    const valid = Boolean(purchaseEvidence) && !rejectionReason;
    return { valid, message: valid ? null : '구매 상품에는 구매 증빙만 필요합니다.' };
  }

  if (result === 'rejected') {
    const valid = Boolean(String(rejectionReason ?? '').trim()) && !purchaseEvidence;
    return { valid, message: valid ? null : '거절 상품에는 거절 이유만 필요합니다.' };
  }

  return { valid: false, message: '알 수 없는 처리 결과입니다.' };
}
