/*
 * 관련 작업: FE-2·FE-8·BE-6 — 보관상품 처리 결과 규칙.
 * 작성 이유: 구매와 거절 결과에 필요한 증빙·사유를 서로 섞거나 빠뜨리면 안 되기 때문.
 * 확인 내용: pending/purchased/rejected별 필수·금지 필드와 알 수 없는 결과 차단.
 */
import { validateStoredItemResult } from './validateStoredItemResult';

test('구매로 바꾸려면 구매 증빙이 있어야 한다', () => {
  expect(validateStoredItemResult({
    result: 'purchased',
    purchaseEvidence: null,
    rejectionReason: null,
  }).valid).toBe(false);
});

test('거절로 바꾸려면 거절 이유가 있어야 한다', () => {
  expect(validateStoredItemResult({
    result: 'rejected',
    purchaseEvidence: null,
    rejectionReason: '',
  }).valid).toBe(false);
});

test('아직 처리 전인 상품에는 구매 증빙이 있으면 안 된다', () => {
  expect(validateStoredItemResult({
    result: 'pending',
    purchaseEvidence: 'path/image.jpg',
    rejectionReason: null,
  }).valid).toBe(false);
});

test('아직 처리 전인 상품은 증빙·사유 없이 둘 수 있다', () => {
  expect(validateStoredItemResult({
    result: 'pending',
    purchaseEvidence: null,
    rejectionReason: null,
  }).valid).toBe(true);
});

test('아직 처리 전인 상품에 거절 이유를 붙이면 안 된다', () => {
  expect(validateStoredItemResult({
    result: 'pending',
    purchaseEvidence: null,
    rejectionReason: '사유',
  }).valid).toBe(false);
});

test('구매한 상품은 증빙만 있고 거절 이유는 없어야 한다', () => {
  expect(validateStoredItemResult({
    result: 'purchased',
    purchaseEvidence: 'deals/purchase/image1.png',
    rejectionReason: null,
  }).valid).toBe(true);
});

test('구매한 상품에 거절 이유를 같이 남기면 안 된다', () => {
  expect(validateStoredItemResult({
    result: 'purchased',
    purchaseEvidence: 'deals/purchase/image1.png',
    rejectionReason: '가격 불일치',
  }).valid).toBe(false);
});

test('거절한 상품은 이유만 있고 구매 증빙은 없어야 한다', () => {
  expect(validateStoredItemResult({
    result: 'rejected',
    purchaseEvidence: null,
    rejectionReason: '연락 두절',
  }).valid).toBe(true);
});

test('거절한 상품에 구매 증빙을 같이 남기면 안 된다', () => {
  expect(validateStoredItemResult({
    result: 'rejected',
    purchaseEvidence: 'deals/purchase/image1.png',
    rejectionReason: '연락 두절',
  }).valid).toBe(false);
});

test('구매·거절·미처리가 아닌 결과는 받지 않는다', () => {
  expect(validateStoredItemResult({
    result: 'mystery',
    purchaseEvidence: null,
    rejectionReason: null,
  }).valid).toBe(false);
});
