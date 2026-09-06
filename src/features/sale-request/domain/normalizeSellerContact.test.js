/*
 * 관련 작업: FE-2 — 판매자 식별용 연락처 정규화.
 * 작성 이유: 같은 사람이 형식만 다르게 다시 신청해도 하나의 Seller로 찾아야 하기 때문.
 * 확인 내용: 휴대폰 숫자 정리, 카카오톡 공백·대소문자 유지, 빈 값, 특수문자 처리.
 */
import { normalizeSellerContact } from './normalizeSellerContact';

describe('같은 판매자를 다른 연락처 형식으로도 찾을 수 있는지', () => {
  test.each([
    ['010-1234-5678', '01012345678'],
    ['010 1234 5678', '01012345678'],
    ['01012345678', '01012345678'],
  ])('하이픈이나 공백이 있어도 같은 휴대폰 번호로 모은다 (%s → %s)', (input, expected) => {
    expect(normalizeSellerContact('phone', input)).toBe(expected);
  });

  test('카카오톡 아이디는 앞뒤 공백만 지우고 내용은 그대로 둔다', () => {
    expect(normalizeSellerContact('kakao', '  seller-id  ')).toBe('seller-id');
  });

  test('카카오톡 아이디의 대소문자를 임의로 바꾸지 않는다', () => {
    expect(normalizeSellerContact('kakao', ' SellerID ')).toBe('SellerID');
  });

  test('비어 있는 연락처는 빈 값으로 남긴다', () => {
    expect(normalizeSellerContact('phone', '   ')).toBe('');
  });

  test('휴대폰 번호에서 숫자만 남겨 같은 사람으로 찾는다', () => {
    expect(normalizeSellerContact('phone', ' 010!1234@5678 ')).toBe('01012345678');
  });
});
