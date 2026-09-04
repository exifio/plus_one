import { validateSaleRequest } from './validateSaleRequest';

const today = '2026-09-04';

const validDraft = {
  convenienceStore: 'gs25',
  promotionType: 'one_plus_one',
  items: [{
    productName: '코카콜라 제로 500ml',
    expirationDate: '2026-09-30',
    originalPrice: 2200,
    askingPrice: 1000,
  }],
  evidenceImage: new File(['image'], 'evidence.png', { type: 'image/png' }),
  contactType: 'phone',
  contactValue: '010-1234-5678',
};

test('gs25는 유효하다', () => {
  expect(validateSaleRequest(validDraft, today).valid).toBe(true);
});

test('cu는 유효하다', () => {
  expect(validateSaleRequest({ ...validDraft, convenienceStore: 'cu' }, today).valid).toBe(true);
});

test('다른 편의점 → 실패', () => {
  expect(validateSaleRequest({ ...validDraft, convenienceStore: 'seven' }, today).valid).toBe(false);
});

test('one_plus_one은 유효하다', () => {
  expect(validateSaleRequest({ ...validDraft, promotionType: 'one_plus_one' }, today).valid).toBe(true);
});

test('two_plus_one은 유효하다', () => {
  expect(validateSaleRequest({ ...validDraft, promotionType: 'two_plus_one' }, today).valid).toBe(true);
});

test('다른 행사 유형 → 실패', () => {
  expect(validateSaleRequest({ ...validDraft, promotionType: 'three_plus_one' }, today).valid).toBe(false);
});

test('items 0개 → 실패', () => {
  expect(validateSaleRequest({ ...validDraft, items: [] }, today).valid).toBe(false);
});

test('evidenceImage 없음 → 실패', () => {
  expect(validateSaleRequest({ ...validDraft, evidenceImage: null }, today).valid).toBe(false);
});

test('phone은 유효하다', () => {
  expect(validateSaleRequest({ ...validDraft, contactType: 'phone' }, today).valid).toBe(true);
});

test('kakao는 유효하다', () => {
  expect(validateSaleRequest({ ...validDraft, contactType: 'kakao' }, today).valid).toBe(true);
});

test('기타 contactType → 실패', () => {
  expect(validateSaleRequest({ ...validDraft, contactType: 'email' }, today).valid).toBe(false);
});

test('contactValue 빈 값 → 실패', () => {
  expect(validateSaleRequest({ ...validDraft, contactValue: '   ' }, today).valid).toBe(false);
});
