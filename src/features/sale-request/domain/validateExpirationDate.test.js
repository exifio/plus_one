/*
 * 관련 작업: FE-2 — 상품 유효기간 규칙.
 * 작성 이유: 과거 상품은 신청할 수 없지만 오늘 만료되는 상품은 허용해야 하기 때문.
 * 확인 내용: 어제·오늘·내일과 날짜 미입력 처리.
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

test('유효기간 미입력(빈 값, null, undefined)은 선택 입력이므로 허용한다', () => {
  expect(validateExpirationDate('', today).valid).toBe(true);
  expect(validateExpirationDate(null, today).valid).toBe(true);
  expect(validateExpirationDate(undefined, today).valid).toBe(true);
});
