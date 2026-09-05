/*
 * 관련 작업: FE-2 — Asia/Seoul 기준 유효기간 날짜 처리.
 * 작성 이유: 서버나 브라우저의 UTC 시각 때문에 한국에서 오늘인 상품이 어제로 바뀌면 안 되기 때문.
 * 확인 내용: 서울 날짜 계산, UTC 날짜 경계, 한 자리 월·일의 0 채우기.
 */
import { getKoreanTodayString } from './getKoreanTodayString';

describe('한국 오늘 날짜 문자열', () => {
  test('서울 오후 시각은 같은 날짜 YYYY-MM-DD로 반환한다', () => {
    const now = new Date('2026-09-04T12:00:00+09:00');
    expect(getKoreanTodayString(now)).toBe('2026-09-04');
  });

  test('UTC 시각이 서울 기준 하루를 넘기면 서울 날짜를 사용한다', () => {
    // 2026-09-04 16:00 UTC = 서울 2026-09-05 01:00
    const now = new Date('2026-09-04T16:00:00Z');
    expect(getKoreanTodayString(now)).toBe('2026-09-05');
  });

  test('UTC 시각이 서울 기준 하루 전이면 전날 서울 날짜를 사용한다', () => {
    // 2026-09-04 02:00 UTC = 서울 2026-09-04 11:00 (KST+9 경계 확인용)
    const now = new Date('2026-09-03T20:00:00Z');
    expect(getKoreanTodayString(now)).toBe('2026-09-04');
  });

  test('한 자리 월/일은 앞에 0을 붙인다', () => {
    const now = new Date('2026-01-05T10:00:00+09:00');
    expect(getKoreanTodayString(now)).toBe('2026-01-05');
  });
});
