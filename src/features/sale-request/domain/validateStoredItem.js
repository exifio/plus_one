import { validatePrice } from './validatePrice';
import { validateExpirationDate } from './validateExpirationDate';

export function validateStoredItem(item, today) {
  const errors = {};

  if (!item || typeof item.productName !== 'string' || !item.productName.trim()) {
    errors.productName = '상품명을 입력해주세요.';
  }

  const dateResult = validateExpirationDate(item?.expirationDate ?? '', today);
  if (!dateResult.valid) {
    errors.expirationDate = dateResult.message;
  }

  const origResult = validatePrice(item?.originalPrice, '구매하셨을 당시의 금액을 입력해 주세요');
  if (!origResult.valid) {
    errors.originalPrice = origResult.message;
  }

  const askResult = validatePrice(item?.askingPrice);
  if (!askResult.valid) {
    errors.askingPrice = askResult.message;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
