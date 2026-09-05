/**
 * 한국 서비스 기준 날짜(Asia/Seoul)를 YYYY-MM-DD로 반환한다.
 *
 * 브라우저가 사용자 위치의 Timezone을 쓰더라도 이 함수는
 * 항상 한국 기준 오늘을 반환해 유효기간 판단 기준을 고정한다.
 *
 * @param {Date} [now] 테스트를 위해 고정할 수 있는 현재 시각
 * @returns {string} 예: '2026-09-04'
 */
export function getKoreanTodayString(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const year = parts.find((part) => part.type === 'year').value;
  const month = parts.find((part) => part.type === 'month').value;
  const day = parts.find((part) => part.type === 'day').value;

  return `${year}-${month}-${day}`;
}