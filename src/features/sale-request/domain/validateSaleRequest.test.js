/*
 * 관련 작업: FE-2·FE-7 — 판매 신청 전체 입력 검증.
 * 작성 이유: 잘못된 편의점·행사·상품·증빙·연락처가 업로드나 RPC까지 도달하면 안 되기 때문.
 * 확인 내용: 허용 값, 등록 방식별 필수값, 가격·유효기간·연락처 검증.
 */
import { validateSaleRequest } from './validateSaleRequest';

const today = '2026-09-04';

const validDraft = {
  convenienceStore: 'gs25',
  promotionType: 'one_plus_one',
  registrationMethod: 'manual',
  items: [{
    productName: '코카콜라 제로 500ml',
    expirationDate: '2026-09-30',
    originalPrice: 2200,
    askingPrice: 1000,
  }],
  evidenceImage: null,
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

test('상품 0개 → 실패', () => {
  expect(validateSaleRequest({ ...validDraft, items: [] }, today).valid).toBe(false);
});

test('직접 입력은 이미지 없이 유효하다', () => {
  expect(validateSaleRequest(validDraft, today).valid).toBe(true);
});

test('스크린샷 입력은 상품 필드 없이 이미지가 있으면 유효하다', () => {
  expect(validateSaleRequest({
    ...validDraft,
    registrationMethod: 'screenshot',
    items: [],
    evidenceImage: new File(['image'], 'evidence.png', { type: 'image/png' }),
  }, today).valid).toBe(true);
});

test('스크린샷 입력은 이미지가 없으면 실패한다', () => {
  expect(validateSaleRequest({
    ...validDraft,
    registrationMethod: 'screenshot',
    items: [],
    evidenceImage: null,
  }, today).valid).toBe(false);
});

test('등록 방식이 없으면 실패한다', () => {
  expect(validateSaleRequest({ ...validDraft, registrationMethod: '' }, today).valid).toBe(false);
});

test('phone은 유효하다', () => {
  expect(validateSaleRequest({ ...validDraft, contactType: 'phone' }, today).valid).toBe(true);
});

test('kakao는 유효하다', () => {
  expect(validateSaleRequest({ ...validDraft, contactType: 'kakao' }, today).valid).toBe(true);
});

test('기타 연락처 유형 → 실패', () => {
  expect(validateSaleRequest({ ...validDraft, contactType: 'email' }, today).valid).toBe(false);
});

test('연락처 값이 빈 값이면 실패', () => {
  expect(validateSaleRequest({ ...validDraft, contactValue: '   ' }, today).valid).toBe(false);
});

test('휴대폰 번호가 11자리가 아니면 실패', () => {
  expect(validateSaleRequest({ ...validDraft, contactValue: '1' }, today).valid).toBe(false);
  expect(validateSaleRequest({ ...validDraft, contactValue: '010-123-4567' }, today).valid).toBe(false);
});

test('휴대폰 번호가 010 또는 011로 시작하는 11자리이면 성공', () => {
  expect(validateSaleRequest({ ...validDraft, contactValue: '010-1234-5678' }, today).valid).toBe(true);
  expect(validateSaleRequest({ ...validDraft, contactValue: '01012345678' }, today).valid).toBe(true);
  expect(validateSaleRequest({ ...validDraft, contactValue: '011-1234-5678' }, today).valid).toBe(true);
});
