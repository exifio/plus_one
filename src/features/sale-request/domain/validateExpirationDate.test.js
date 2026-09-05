/*
 * 관련 작업: FE-2 — 상품 유효기간 규칙.
 * 작성 이유: 유효기간은 선택 입력으로 두되, 입력한 과거 상품은 막아야 하기 때문.
 * 확인 내용: 어제·오늘·내일과 선택 입력 처리.
 */
import { validateExpirationDate } from './validateExpirationDate';

const today = '2026-09-04';

test('어제 만료된 상품은 거부한다', () => {
  expect(validateExpirationDate('2026-09-03', today).valid).toBe(false);
});

test('오늘 만료되는 상품은 허용한다', () => {
  expect(validateExpirationDate('2026-09-04', today).valid).toBe(true);
});

test('내일 만료되는 상품은 허용한다', () => {
  expect(validateExpirationDate('2026-09-05', today).valid).toBe(true);
});

test('유효기간을 입력하지 않아도 유효하다', () => {
  expect(validateExpirationDate('', today).valid).toBe(true);
  expect(validateExpirationDate('   ', today).valid).toBe(true);
  expect(validateExpirationDate(null, today).valid).toBe(true);
  expect(validateExpirationDate(undefined, today).valid).toBe(true);
});
