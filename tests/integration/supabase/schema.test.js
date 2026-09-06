/** @jest-environment node */

/*
 * 관련 작업: BE-2 — non-production Supabase 핵심 스키마와 제약 조건.
 * 작성 이유: 화면 검증만 통과하고 DB에 잘못된 값이 저장되는 일을 막아야 하기 때문.
 * 확인 내용: Seller 중복, 신청 enum, 상품 가격·결과 보조 필드, 모집 singleton 제약.
 */
import { createServiceClient } from './clients';
import { TEST_CONTACT } from './testFixtures';

describe('잘못된 값이 데이터베이스에 저장되지 않는지', () => {
  let serviceClient;
  let saleRequestId;
  let sellerId;

  beforeAll(async () => {
    serviceClient = createServiceClient();
    const { error: statusError } = await serviceClient.rpc('update_recruitment_status', {
      p_status: 'open',
    });
    if (statusError) throw statusError;

    const { data, error } = await serviceClient.rpc('create_sale_request', {
      p_contact_type: 'phone',
      p_contact_value: TEST_CONTACT.SCHEMA_CONSTRAINT,
      p_convenience_store: 'gs25',
      p_promotion_type: 'one_plus_one',
      p_evidence_image: 'anonymous/schema/invalid-result.png',
      p_registration_method: 'manual',
      p_items: [
        {
          product_name: '스키마 제약 테스트 상품',
          expiration_date: '2026-12-01',
          original_price: 1000,
          asking_price: 500,
        },
      ],
    });
    if (error) throw error;
    saleRequestId = data.sale_request_id;
    sellerId = data.seller_id;
  });

  test('아직 처리 전인 상품에 구매 증빙을 저장하지 못하게 한다', async () => {
    const { error } = await serviceClient.from('stored_items').insert({
      sale_request_id: saleRequestId,
      product_name: '잘못된 보조데이터 상품',
      expiration_date: '2026-12-01',
      original_price: 1000,
      asking_price: 500,
      result: 'pending',
      purchase_evidence: 'admin/schema/purchase.jpg',
      rejection_reason: null,
    });

    expect(error).not.toBeNull();
  });

  test.each([
    { product_name: null },
    { original_price: null },
    { asking_price: null },
  ])('직접 입력 상품의 필수 값(%s)을 비워 저장하지 못하게 한다', async (missingField) => {
    const { error } = await serviceClient.from('stored_items').insert({
      sale_request_id: saleRequestId,
      product_name: '필수 필드 제약 테스트 상품',
      expiration_date: '2026-12-01',
      original_price: 1000,
      asking_price: 500,
      ...missingField,
    });

    expect(error).not.toBeNull();
  });

  test('유효기간은 비워 저장할 수 있다', async () => {
    const { data, error } = await serviceClient
      .from('stored_items')
      .insert({
        sale_request_id: saleRequestId,
        product_name: '선택 유효기간 테스트 상품',
        expiration_date: null,
        original_price: 1000,
        asking_price: 500,
      })
      .select('stored_item_id')
      .single();

    expect(error).toBeNull();

    if (data?.stored_item_id) {
      await serviceClient
        .from('stored_items')
        .delete()
        .eq('stored_item_id', data.stored_item_id);
    }
  });

  test('같은 연락 방법·연락처로 판매자를 두 명 만들지 않는다', async () => {
    const { error } = await serviceClient.from('sellers').insert({
      contact_type: 'phone',
      contact_value: TEST_CONTACT.SCHEMA_CONSTRAINT,
    });

    expect(error).not.toBeNull();
  });

  test.each([
    ['convenience_store', 'seven11'],
    ['promotion_type', 'three_plus_one'],
    ['status', 'unknown'],
  ])('정해지지 않은 편의점·행사·신청 상태(%s)는 저장하지 않는다', async (field, value) => {
    const { error } = await serviceClient.from('sale_requests').insert({
      seller_id: sellerId,
      convenience_store: field === 'convenience_store' ? value : 'gs25',
      promotion_type: field === 'promotion_type' ? value : 'one_plus_one',
      status: field === 'status' ? value : 'received',
      evidence_image: 'anonymous/schema/invalid-enum.png',
    });

    expect(error).not.toBeNull();
  });

  test.each([
    { original_price: 0, asking_price: 500, result: 'pending' },
    { original_price: 1000, asking_price: -1, result: 'pending' },
    { original_price: 1000, asking_price: 500, result: 'unknown' },
  ])('가격이 0이거나 결과가 이상하면 상품을 저장하지 않는다', async (values) => {
    const { error } = await serviceClient.from('stored_items').insert({
      sale_request_id: saleRequestId,
      product_name: '잘못된 스키마 값 상품',
      expiration_date: '2026-12-01',
      ...values,
    });

    expect(error).not.toBeNull();
  });

  test('모집 설정은 한 줄만 두고, 처음에는 모집 중이다', async () => {
    const { data, error } = await serviceClient
      .from('recruitment_settings')
      .select('id, status')
      .single();

    expect(error).toBeNull();
    expect(data).toEqual({ id: 1, status: 'open' });

    const { error: extraRowError } = await serviceClient
      .from('recruitment_settings')
      .insert({ id: 2, status: 'open' });
    expect(extraRowError).not.toBeNull();

    const { error: invalidStatusError } = await serviceClient
      .from('recruitment_settings')
      .insert({ id: 1, status: 'invalid' });
    expect(invalidStatusError).not.toBeNull();
  });
});
