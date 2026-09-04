import { validateStoredItemResult } from './validateStoredItemResult';

test('구매는 구매 증빙이 필요하다', () => {
  expect(validateStoredItemResult({
    result: 'purchased',
    purchaseEvidence: null,
    rejectionReason: null,
  }).valid).toBe(false);
});

test('거절은 거절 이유가 필요하다', () => {
  expect(validateStoredItemResult({
    result: 'rejected',
    purchaseEvidence: null,
    rejectionReason: '',
  }).valid).toBe(false);
});

test('미처리 상태에는 구매 증빙과 거절 이유가 없어야 한다', () => {
  expect(validateStoredItemResult({
    result: 'pending',
    purchaseEvidence: 'path/image.jpg',
    rejectionReason: null,
  }).valid).toBe(false);
});
