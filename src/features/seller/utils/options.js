export const STORE_OPTIONS = [
  { value: 'gs25', label: 'GS25' },
  { value: 'cu', label: 'CU' },
];

export const PROMOTION_OPTIONS = [
  { value: 'one_plus_one', label: '1+1' },
  { value: 'two_plus_one', label: '2+1' },
];

export const REGISTRATION_METHOD_OPTIONS = [
  { value: 'screenshot', label: '스크린샷으로 등록' },
  { value: 'manual', label: '직접 입력하기' },
];

export const CONTACT_OPTIONS = [
  { value: 'phone', label: '휴대폰' },
  { value: 'kakao', label: '카카오톡' },
];

export function labelFor(options, value) {
  return options.find((option) => option.value === value)?.label ?? '';
}
