/*
 * 관련 작업: FE-2 — 판매자 식별용 연락처 정규화.
 * 작성 이유: 같은 사람이 형식만 다르게 다시 신청해도 하나의 Seller로 찾아야 하기 때문.
 * 확인 내용: 휴대폰 숫자 정리, 카카오톡 trim, 빈 값, 특수문자 처리.
 */
import { normalizeSellerContact } from './normalizeSellerContact';

describe('판매자 연락처 정규화', () => {
  test.each([
    ['010-1234-5678', '01012345678'],
    ['010 1234 5678', '01012345678'],
    ['01012345678', '01012345678'],
  ])('휴대폰 번호 %s를 %s로 정규화한다', (input, expected) => {
    expect(normalizeSellerContact('phone', input)).toBe(expected);
  });

  test('카카오톡 연락처는 앞뒤 공백만 제거한다', () => {
    expect(normalizeSellerContact('kakao', '  seller-id  ')).toBe('seller-id');
  });

  test('빈 연락처는 빈 문자열로 반환한다', () => {
    expect(normalizeSellerContact('phone', '   ')).toBe('');
  });

  test('전화번호에 숫자가 아닌 문자가 섞여도 숫자만 남긴다', () => {
    expect(normalizeSellerContact('phone', ' 010!1234@5678 ')).toBe('01012345678');
  });
});
