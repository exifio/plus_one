/*
 * 관련 작업: FE-2 — 상품 가격 규칙.
 * 작성 이유: DB에 저장되는 행사 가격과 희망 가격은 0보다 큰 정수여야 하기 때문.
 * 확인 내용: 양의 정수 허용과 0·음수·소수·문자열 거부.
 */
import { validatePrice } from './validatePrice';

test.each([
  [1000, true],
  [1, true],
  [0, false],
  [-1, false],
  [1.5, false],
  ['abc', false],
  ['', false],
])('가격 %p의 유효성은 %p다', (value, expected) => {
  expect(validatePrice(value).valid).toBe(expected);
});
