/*
 * 관련 작업: FE-2·FE-7 — 판매 신청 전체 입력 검증.
 * 작성 이유: 잘못된 편의점·행사·상품·증빙·연락처가 업로드나 RPC까지 도달하면 안 되기 때문.
 * 확인 내용: 허용 값, 등록 방식별 상품 정보·증빙·가격·선택 유효기간·연락처 검증.
 */
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

test('GS25 1+1 신청은 받을 수 있다', () => {
  expect(validateSaleRequest(validDraft, today).valid).toBe(true);
});

test('CU 2+1 신청도 받을 수 있다', () => {
  expect(validateSaleRequest({
    ...validDraft,
    convenienceStore: 'cu',
    promotionType: 'two_plus_one',
  }, today).valid).toBe(true);
});

test('정해진 편의점·행사만 받고 다른 값은 막는다', () => {
  expect(validateSaleRequest({ ...validDraft, convenienceStore: 'seven' }, today).valid).toBe(false);
  expect(validateSaleRequest({ ...validDraft, promotionType: 'three_plus_one' }, today).valid).toBe(false);
});

test('상품이 하나도 없으면 신청을 받지 않는다', () => {
  expect(validateSaleRequest({ ...validDraft, items: [] }, today).valid).toBe(false);
});

test('스크린샷 등록인데 사진이 없으면 신청을 받지 않는다', () => {
  expect(validateSaleRequest({
    ...validDraft,
    registrationMethod: 'screenshot',
    evidenceImage: null,
  }, today).valid).toBe(false);
});

test('스크린샷 등록은 상품명 없이도 신청할 수 있다', () => {
  expect(validateSaleRequest({
    ...validDraft,
    registrationMethod: 'screenshot',
    items: [{ productName: '', expirationDate: '', originalPrice: null, askingPrice: 1000 }],
  }, today).valid).toBe(true);
});

test('직접 입력은 사진 없이도 신청할 수 있다', () => {
  expect(validateSaleRequest({
    ...validDraft,
    registrationMethod: 'manual',
    evidenceImage: null,
  }, today).valid).toBe(true);
});

test('등록 방식을 고르지 않으면 신청을 받지 않는다', () => {
  expect(validateSaleRequest({ ...validDraft, registrationMethod: '' }, today).valid).toBe(false);
});

test('유효기간을 비워 두어도 신청 자체는 받을 수 있다', () => {
  expect(validateSaleRequest({
    ...validDraft,
    items: [{ ...validDraft.items[0], expirationDate: '' }],
  }, today).valid).toBe(true);
});

test('휴대폰이나 카카오톡 연락처면 신청할 수 있다', () => {
  expect(validateSaleRequest(validDraft, today).valid).toBe(true);
  expect(validateSaleRequest({
    ...validDraft,
    contactType: 'kakao',
    contactValue: 'seller-id',
  }, today).valid).toBe(true);
});

test('휴대폰·카카오톡이 아닌 연락 방법은 받지 않는다', () => {
  expect(validateSaleRequest({ ...validDraft, contactType: 'email' }, today).valid).toBe(false);
});

test('연락처가 비어 있으면 신청을 받지 않는다', () => {
  expect(validateSaleRequest({ ...validDraft, contactValue: '   ' }, today).valid).toBe(false);
});

test('휴대폰 번호는 010 또는 011로 시작하는 11자리여야 한다', () => {
  expect(validateSaleRequest({ ...validDraft, contactValue: '1' }, today).valid).toBe(false);
  expect(validateSaleRequest({ ...validDraft, contactValue: '010-123-4567' }, today).valid).toBe(false);
  expect(validateSaleRequest({ ...validDraft, contactValue: '01012345678' }, today).valid).toBe(true);
  expect(validateSaleRequest({ ...validDraft, contactValue: '011-1234-5678' }, today).valid).toBe(true);
});
