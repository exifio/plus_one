import { validateStoredItem } from './validateStoredItem';

const VALID_STORES = ['gs25', 'cu'];
const VALID_PROMOTIONS = ['one_plus_one', 'two_plus_one'];
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

  if (!Array.isArray(draft.items) || draft.items.length === 0) {
    errors.items = '최소 1개 이상의 상품을 등록해주세요.';
  }

  if (!draft.evidenceImage) {
    errors.evidenceImage = '보관상품 확인 이미지를 등록해주세요.';
  }

  if (!VALID_CONTACT_TYPES.includes(draft.contactType)) {
    errors.contactType = '휴대폰 또는 카카오톡을 선택해주세요.';
  }

  if (!draft.contactValue || !String(draft.contactValue ?? '').trim()) {
    errors.contactValue = '연락처를 입력해주세요.';
  }

  if (draft.items && draft.items.length > 0) {
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
