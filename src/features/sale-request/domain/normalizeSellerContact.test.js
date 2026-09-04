import { normalizeSellerContact } from './normalizeSellerContact';

describe('normalizeSellerContact', () => {
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
});
