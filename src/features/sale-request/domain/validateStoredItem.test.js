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

test('유효기간 없음 → 실패', () => {
  const result = validateStoredItem({ ...validItem, expirationDate: '' }, today);
  expect(result.valid).toBe(false);
});

test('과거 유효기간 → 실패', () => {
  const result = validateStoredItem({ ...validItem, expirationDate: '2026-09-03' }, today);
  expect(result.valid).toBe(false);
  expect(result.errors.expirationDate).toBeDefined();
});

test('originalPrice <= 0 → 실패', () => {
  expect(validateStoredItem({ ...validItem, originalPrice: 0 }, today).valid).toBe(false);
  expect(validateStoredItem({ ...validItem, originalPrice: -1 }, today).valid).toBe(false);
});

test('askingPrice <= 0 → 실패', () => {
  expect(validateStoredItem({ ...validItem, askingPrice: 0 }, today).valid).toBe(false);
  expect(validateStoredItem({ ...validItem, askingPrice: -100 }, today).valid).toBe(false);
});

test('askingPrice > originalPrice → 성공 (정상)', () => {
  expect(validateStoredItem({ ...validItem, askingPrice: 3000 }, today).valid).toBe(true);
});
