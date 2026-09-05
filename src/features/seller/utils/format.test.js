/*
 * 관련 작업: FE-7 — 판매자 입력 화면의 표시·입력 보조 함수.
 * 작성 이유: 가격·날짜·전화번호를 잘못 표시하거나 읽으면 신청 내용이 달라질 수 있기 때문.
 * 확인 내용: 정상 값의 표시 형식과 비어 있거나 잘못된 입력의 안전한 처리.
 */
import {
  formatDate,
  formatDateTime,
  formatPhoneNumber,
  formatPrice,
  isValidPhoneNumber,
  parsePriceInput,
} from './format';

describe('가격 포맷', () => {
  test.each([
    [2200, '2,200원'],
    [1, '1원'],
    [1000000, '1,000,000원'],
  ])('%p를 %p로 포맷한다', (value, expected) => {
    expect(formatPrice(value)).toBe(expected);
  });

  test('빈 값은 빈 문자열을 반환한다', () => {
    expect(formatPrice(null)).toBe('');
    expect(formatPrice(undefined)).toBe('');
    expect(formatPrice('')).toBe('');
  });
});

describe('날짜 포맷', () => {
  test('YYYY-MM-DD를 2026. 09. 30 형태로 변환한다', () => {
    expect(formatDate('2026-09-30')).toBe('2026. 09. 30');
  });

  test('빈 값은 빈 문자열을 반환한다', () => {
    expect(formatDate('')).toBe('');
  });
});

describe('날짜·시간 포맷', () => {
  test('ISO 날짜를 09.04 15:21 형태로 변환한다', () => {
    expect(formatDateTime('2026-09-04T15:21:30.000Z')).toBe('09.05 00:21');
  });

  test('한 자리 월/일/시/분은 앞에 0을 붙인다', () => {
    expect(formatDateTime('2026-01-05T03:05:00.000Z')).toBe('01.05 12:05');
  });

  test('빈 값은 빈 문자열을 반환한다', () => {
    expect(formatDateTime('')).toBe('');
    expect(formatDateTime('invalid')).toBe('');
  });
});

describe('가격 입력 파싱', () => {
  test.each([
    ['2,200', 2200],
    ['1000원', 1000],
    [' 1500 ', 1500],
    ['12a34', 1234],
  ])('%s를 %d로 파싱한다', (input, expected) => {
    expect(parsePriceInput(input)).toBe(expected);
  });

  test('숫자가 하나도 없거나 빈 값이면 null을 반환한다', () => {
    expect(parsePriceInput('')).toBe(null);
    expect(parsePriceInput('abc')).toBe(null);
    expect(parsePriceInput(null)).toBe(null);
  });
});

describe('휴대폰 번호 포맷', () => {
  test.each([
    ['01012345678', '010-1234-5678'],
    ['010-1234-5678', '010-1234-5678'],
    ['0101234', '010-1234'],
    ['010', '010'],
    ['01', '01'],
    ['', ''],
    [null, ''],
    ['0101234567899', '010-1234-5678'],
  ])('%s를 %s로 포맷한다', (input, expected) => {
    expect(formatPhoneNumber(input)).toBe(expected);
  });
});

describe('휴대폰 번호 유효성', () => {
  test('010 또는 011로 시작하는 11자리 숫자는 유효하다', () => {
    expect(isValidPhoneNumber('010-1234-5678')).toBe(true);
    expect(isValidPhoneNumber('01012345678')).toBe(true);
    expect(isValidPhoneNumber('011-1234-5678')).toBe(true);
    expect(isValidPhoneNumber('01112345678')).toBe(true);
  });

  test('11자리가 아니거나 010/011이 아니면 유효하지 않다', () => {
    expect(isValidPhoneNumber('1')).toBe(false);
    expect(isValidPhoneNumber('010-123-4567')).toBe(false);
    expect(isValidPhoneNumber('016-1234-5678')).toBe(false);
    expect(isValidPhoneNumber('')).toBe(false);
    expect(isValidPhoneNumber(null)).toBe(false);
  });
});
