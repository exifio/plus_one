/** 숫자를 2,200원 형태로 포맷한다. */
export function formatPrice(value) {
  if (value === null || value === undefined || value === '') return '';
  return `${Number(value).toLocaleString('ko-KR')}원`;
}

/** YYYY-MM-DD를 2026. 09. 30 형태로 포맷한다. */
export function formatDate(value) {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  return `${year}. ${month}. ${day}`;
}

/** ISO/Date를 09.04 15:21 형태로 포맷한다. */
export function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  return `${mm}.${dd} ${hh}:${mi}`;
}

/** 입력값에서 숫자만 남겨 양의 정수로 파싱한다. 빈 값은 null. */
export function parsePriceInput(value) {
  const digits = String(value ?? '').replace(/[^0-9]/g, '');
  return digits === '' ? null : Number(digits);
}

/** 휴대폰 번호 입력을 010-1234-5678 형태로 포맷한다. 최대 11자리 숫자. */
export function formatPhoneNumber(value) {
  const digits = String(value ?? '').replace(/[^0-9]/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

/** 010 또는 011로 시작하는 11자리 휴대폰 번호인지 검증한다. */
export function isValidPhoneNumber(value) {
  const digits = String(value ?? '').replace(/[^0-9]/g, '');
  const isValidPrefix = digits.startsWith('010') || digits.startsWith('011');
  return digits.length === 11 && isValidPrefix;
}
