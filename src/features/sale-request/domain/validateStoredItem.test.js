/*
 * 관련 작업: FE-2 — 보관상품 한 개의 입력 검증.
 * 작성 이유: 신청 안에 들어가는 각 상품의 이름·가격·유효기간이 저장 전에 안전해야 하기 때문.
 * 확인 내용: 정상 상품, 상품명·가격 오류, 선택적 유효기간, 희망가가 원가보다 높은 경우.
 */
import { validateStoredItem } from './validateStoredItem';

const today = '2026-09-04';

const validItem = {
  productName: '코카콜라 제로 500ml',
  expirationDate: '2026-09-30',
  originalPrice: 2200,
  askingPrice: 1000,
};

test('정상 상품은 유효하다', () => {
  expect(validateStoredItem(validItem, today).valid).toBe(true);
});

test('상품명 없음 → 실패', () => {
  const result = validateStoredItem({ ...validItem, productName: '' }, today);
  expect(result.valid).toBe(false);
  expect(result.errors.productName).toBeDefined();
});

test('유효기간 없음 (선택 입력) → 성공', () => {
  const result = validateStoredItem({ ...validItem, expirationDate: '' }, today);
  expect(result.valid).toBe(true);
  expect(result.errors.expirationDate).toBeUndefined();
});

test('과거 유효기간 → 실패', () => {
  const result = validateStoredItem({ ...validItem, expirationDate: '2026-09-03' }, today);
  expect(result.valid).toBe(false);
  expect(result.errors.expirationDate).toBeDefined();
});

test('행사 당시 가격 <= 0 → 실패', () => {
  expect(validateStoredItem({ ...validItem, originalPrice: 0 }, today).valid).toBe(false);
  expect(validateStoredItem({ ...validItem, originalPrice: -1 }, today).valid).toBe(false);
});

test('판매 희망 가격 <= 0 → 실패', () => {
  expect(validateStoredItem({ ...validItem, askingPrice: 0 }, today).valid).toBe(false);
  expect(validateStoredItem({ ...validItem, askingPrice: -100 }, today).valid).toBe(false);
});

test('판매 희망 가격 > 행사 당시 가격 → 성공 (정상)', () => {
  expect(validateStoredItem({ ...validItem, askingPrice: 3000 }, today).valid).toBe(true);
});
