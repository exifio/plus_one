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

describe('가격을 사람이 읽기 쉽게 보여주는지', () => {
  test.each([
    [2200, '2,200원'],
    [1, '1원'],
    [1000000, '1,000,000원'],
  ])('가격 %p를 %p로 보여준다', (value, expected) => {
    expect(formatPrice(value)).toBe(expected);
  });

  test('값이 없으면 빈 칸으로 보여준다', () => {
    expect(formatPrice(null)).toBe('');
    expect(formatPrice(undefined)).toBe('');
    expect(formatPrice('')).toBe('');
  });
});

describe('날짜를 사람이 읽기 쉽게 보여주는지', () => {
  test('저장용 날짜를 화면에 보기 좋은 형태로 바꾼다', () => {
    expect(formatDate('2026-09-30')).toBe('2026. 09. 30');
  });

  test('값이 없으면 빈 칸으로 보여준다', () => {
    expect(formatDate('')).toBe('');
  });
});

describe('신청 시각을 한국 기준으로 보여주는지', () => {
  test('서버 시각을 한국 시간 월.일 시:분으로 보여준다', () => {
    expect(formatDateTime('2026-09-04T15:21:30.000Z')).toBe('09.05 00:21');
  });

  test('한 자리 월·일·시·분도 자리를 맞춰 보여준다', () => {
    expect(formatDateTime('2026-01-05T03:05:00.000Z')).toBe('01.05 12:05');
  });

  test('값이 없으면 빈 칸으로 보여준다', () => {
    expect(formatDateTime('')).toBe('');
    expect(formatDateTime('invalid')).toBe('');
  });
});

describe('가격 칸에 쉼표나 원을 넣어도 숫자로 읽는지', () => {
  test.each([
    ['2,200', 2200],
    ['1000원', 1000],
    [' 1500 ', 1500],
    ['12a34', 1234],
  ])('가격 입력 %s를 숫자 %d로 읽는다', (input, expected) => {
    expect(parsePriceInput(input)).toBe(expected);
  });

  test('가격 칸이 비어 있으면 숫자로 만들지 않는다', () => {
    expect(parsePriceInput('')).toBe(null);
    expect(parsePriceInput('abc')).toBe(null);
    expect(parsePriceInput(null)).toBe(null);
  });
});

describe('휴대폰 번호를 보기 쉽게 하이픈을 넣는지', () => {
  test.each([
    ['01012345678', '010-1234-5678'],
    ['010-1234-5678', '010-1234-5678'],
    ['0101234', '010-1234'],
    ['010', '010'],
    ['01', '01'],
    ['', ''],
    [null, ''],
    ['0101234567899', '010-1234-5678'],
  ])('휴대폰 번호 %s를 %s로 보여준다', (input, expected) => {
    expect(formatPhoneNumber(input)).toBe(expected);
  });
});

describe('휴대폰 번호가 신청에 쓸 수 있는 형식인지', () => {
  test('010 또는 011로 시작하는 11자리면 연락처로 받는다', () => {
    expect(isValidPhoneNumber('010-1234-5678')).toBe(true);
    expect(isValidPhoneNumber('01012345678')).toBe(true);
    expect(isValidPhoneNumber('011-1234-5678')).toBe(true);
    expect(isValidPhoneNumber('01112345678')).toBe(true);
  });

  test('자릿수나 시작 번호가 다르면 휴대폰 연락처로 받지 않는다', () => {
    expect(isValidPhoneNumber('1')).toBe(false);
    expect(isValidPhoneNumber('010-123-4567')).toBe(false);
    expect(isValidPhoneNumber('016-1234-5678')).toBe(false);
    expect(isValidPhoneNumber('')).toBe(false);
    expect(isValidPhoneNumber(null)).toBe(false);
  });
});
