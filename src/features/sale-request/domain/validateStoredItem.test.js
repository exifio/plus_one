/*
 * 관련 작업: FE-2 — 보관상품 한 개의 입력 검증.
 * 작성 이유: 신청 안에 들어가는 각 상품의 이름·가격이 저장 전에 안전해야 하기 때문.
 * 확인 내용: 정상 상품, 상품명·가격·유효기간 오류, 선택 유효기간, 희망가가 원가보다 높은 경우.
 */
import { validateStoredItem } from './validateStoredItem';

const today = '2026-09-04';

const validItem = {
  productName: '코카콜라 제로 500ml',
  expirationDate: '2026-09-30',
  originalPrice: 2200,
  askingPrice: 1000,
};

test('이름·가격이 있는 상품은 저장할 수 있다', () => {
  expect(validateStoredItem(validItem, today).valid).toBe(true);
});

test('직접 입력인데 상품명이 없으면 막는다', () => {
  const result = validateStoredItem({ ...validItem, productName: '' }, today);
  expect(result.valid).toBe(false);
  expect(result.errors.productName).toBeDefined();
});

test('유효기간을 비워 두어도 상품 검증은 통과한다', () => {
  const result = validateStoredItem({ ...validItem, expirationDate: '' }, today);
  expect(result.valid).toBe(true);
  expect(result.errors.expirationDate).toBeUndefined();
});

test('이미 지난 유효기간이 있으면 그 상품을 막는다', () => {
  const result = validateStoredItem({ ...validItem, expirationDate: '2026-09-03' }, today);
  expect(result.valid).toBe(false);
  expect(result.errors.expirationDate).toBeDefined();
});

test('행사 당시 가격이 0원이면 막는다', () => {
  expect(validateStoredItem({ ...validItem, originalPrice: 0 }, today).valid).toBe(false);
  expect(validateStoredItem({ ...validItem, originalPrice: -1 }, today).valid).toBe(false);
});

test('판매 희망 가격이 0원이면 막는다', () => {
  expect(validateStoredItem({ ...validItem, askingPrice: 0 }, today).valid).toBe(false);
  expect(validateStoredItem({ ...validItem, askingPrice: -100 }, today).valid).toBe(false);
});

test('희망 가격이 원래 가격보다 높아도 받을 수 있다', () => {
  expect(validateStoredItem({ ...validItem, askingPrice: 3000 }, today).valid).toBe(true);
});

test('스크린샷 등록은 희망 가격만 있어도 된다', () => {
  expect(validateStoredItem({
    productName: '',
    expirationDate: '',
    originalPrice: null,
    askingPrice: 1000,
  }, today, 'screenshot').valid).toBe(true);
});
