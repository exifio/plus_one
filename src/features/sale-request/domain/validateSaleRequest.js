import { validateStoredItem } from './validateStoredItem';

const VALID_STORES = ['gs25', 'cu'];
const VALID_PROMOTIONS = ['one_plus_one', 'two_plus_one'];
const VALID_REGISTRATION_METHODS = ['screenshot', 'manual'];
const VALID_CONTACT_TYPES = ['phone', 'kakao'];

export function validateSaleRequest(draft, today) {
  const errors = {};

  if (!draft) {
    return { valid: false, errors: { _: 'draft is required' } };
  }

  if (!VALID_STORES.includes(draft.convenienceStore)) {
    errors.convenienceStore = 'gs25 또는 cu만 선택해주세요.';
  }

  if (!VALID_PROMOTIONS.includes(draft.promotionType)) {
    errors.promotionType = '1+1 또는 2+1만 선택해주세요.';
  }

  if (!VALID_REGISTRATION_METHODS.includes(draft.registrationMethod)) {
    errors.registrationMethod = '상품 정보 등록 방식을 선택해주세요.';
  }

  if (draft.registrationMethod === 'screenshot' && !draft.evidenceImage) {
    errors.evidenceImage = '상품 정보 스크린샷을 첨부해주세요.';
  }

  if (!VALID_CONTACT_TYPES.includes(draft.contactType)) {
    errors.contactType = '휴대폰 또는 카카오톡을 선택해주세요.';
  }

  if (!draft.contactValue || !String(draft.contactValue ?? '').trim()) {
    errors.contactValue = '연락처를 입력해주세요.';
  } else if (draft.contactType === 'phone') {
    const digits = String(draft.contactValue ?? '').replace(/[^0-9]/g, '');
    const isValidPrefix = digits.startsWith('010') || digits.startsWith('011');
    if (digits.length !== 11 || !isValidPrefix) {
      errors.contactValue = '휴대폰 번호 11자리를 올바르게 입력해주세요.';
    }
  }

  if (draft.registrationMethod === 'manual'
    && (!Array.isArray(draft.items) || draft.items.length === 0)) {
    errors.items = '최소 1개 이상의 상품을 등록해주세요.';
  }

  if (draft.registrationMethod === 'manual' && draft.items && draft.items.length > 0) {
    draft.items.forEach((item, i) => {
      const itemResult = validateStoredItem(item, today);
      if (!itemResult.valid) {
        errors[`item_${i}`] = itemResult.errors;
      }
    });
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
