export function validatePrice(value) {
  const valid = Number.isInteger(value) && value > 0;
  return {
    valid,
    message: valid ? null : '0보다 큰 원 단위 정수를 입력해주세요.',
  };
}
