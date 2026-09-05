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

test('gs25와 one_plus_one 상품 신청은 유효하다', () => {
  expect(validateSaleRequest(validDraft, today).valid).toBe(true);
});

test('cu와 two_plus_one도 유효하다', () => {
  expect(validateSaleRequest({
    ...validDraft,
    convenienceStore: 'cu',
    promotionType: 'two_plus_one',
  }, today).valid).toBe(true);
});

test('허용되지 않은 편의점·행사 유형은 실패한다', () => {
  expect(validateSaleRequest({ ...validDraft, convenienceStore: 'seven' }, today).valid).toBe(false);
  expect(validateSaleRequest({ ...validDraft, promotionType: 'three_plus_one' }, today).valid).toBe(false);
});

test('상품이 없으면 실패한다', () => {
  expect(validateSaleRequest({ ...validDraft, items: [] }, today).valid).toBe(false);
});

test('증빙 이미지가 없으면 실패한다', () => {
  expect(validateSaleRequest({
    ...validDraft,
    registrationMethod: 'screenshot',
    evidenceImage: null,
  }, today).valid).toBe(false);
});

test('스크린샷 등록은 상품명·행사 당시 가격 없이도 유효하다', () => {
  expect(validateSaleRequest({
    ...validDraft,
    registrationMethod: 'screenshot',
    items: [{ productName: '', expirationDate: '', originalPrice: null, askingPrice: 1000 }],
  }, today).valid).toBe(true);
});

test('직접 입력은 이미지 없이도 유효하다', () => {
  expect(validateSaleRequest({
    ...validDraft,
    registrationMethod: 'manual',
    evidenceImage: null,
  }, today).valid).toBe(true);
});

test('등록 방식을 선택하지 않으면 실패한다', () => {
  expect(validateSaleRequest({ ...validDraft, registrationMethod: '' }, today).valid).toBe(false);
});

test('유효기간이 없어도 신청 검증은 성공한다', () => {
  expect(validateSaleRequest({
    ...validDraft,
    items: [{ ...validDraft.items[0], expirationDate: '' }],
  }, today).valid).toBe(true);
});

test('phone과 kakao 연락처는 유효하다', () => {
  expect(validateSaleRequest(validDraft, today).valid).toBe(true);
  expect(validateSaleRequest({
    ...validDraft,
    contactType: 'kakao',
    contactValue: 'seller-id',
  }, today).valid).toBe(true);
});

test('허용되지 않은 연락처 유형은 실패한다', () => {
  expect(validateSaleRequest({ ...validDraft, contactType: 'email' }, today).valid).toBe(false);
});

test('연락처가 비어 있으면 실패한다', () => {
  expect(validateSaleRequest({ ...validDraft, contactValue: '   ' }, today).valid).toBe(false);
});

test('휴대폰 번호는 010 또는 011로 시작하는 11자리여야 한다', () => {
  expect(validateSaleRequest({ ...validDraft, contactValue: '1' }, today).valid).toBe(false);
  expect(validateSaleRequest({ ...validDraft, contactValue: '010-123-4567' }, today).valid).toBe(false);
  expect(validateSaleRequest({ ...validDraft, contactValue: '01012345678' }, today).valid).toBe(true);
  expect(validateSaleRequest({ ...validDraft, contactValue: '011-1234-5678' }, today).valid).toBe(true);
});
