export function validateExpirationDate(value, today) {
  if (value === null || value === undefined || value === '') {
    return { valid: false, message: '유효기간을 입력해주세요.' };
  }

  const valid = typeof value === 'string'
    && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && value >= today;
  return {
    valid,
    message: valid ? null : '이미 유효기간이 지난 상품은 등록할 수 없어요.',
  };
}
