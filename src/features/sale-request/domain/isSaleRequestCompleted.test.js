/*
 * 관련 작업: FE-2·BE-6 — 신청 완료 여부 계산.
 * 작성 이유: 모든 상품이 구매 또는 거절로 최종 처리된 때에만 신청을 completed로 바꿔야 하기 때문.
 * 확인 내용: 최종 결과 조합, pending 포함, 빈 상품 목록.
 */
import { isSaleRequestCompleted } from './isSaleRequestCompleted';

test.each([
  [['purchased'], true],
  [['rejected'], true],
  [['purchased', 'rejected'], true],
  [['purchased', 'pending'], false],
  [['rejected', 'pending'], false],
  [['pending'], false],
  [[], false],
])('상품 결과가 %p이면 신청 완료 여부는 %p다', (results, expected) => {
  expect(isSaleRequestCompleted(results)).toBe(expected);
});
