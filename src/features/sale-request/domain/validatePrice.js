export function validatePrice(value, customMessage) {
  const valid = Number.isInteger(value) && value > 0;
  return {
    valid,
    message: valid ? null : (customMessage || '정확한 금액을 입력해주세요.'),
  };
}
