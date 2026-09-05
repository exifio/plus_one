/** @jest-environment node */

/*
 * 관련 작업: BE-2 — non-production Supabase 핵심 스키마와 제약 조건.
 * 작성 이유: 화면 검증만 통과하고 DB에 잘못된 값이 저장되는 일을 막아야 하기 때문.
 * 확인 내용: Seller 중복, 신청 enum, 상품 가격·결과 보조 필드, 모집 singleton 제약.
 */
import { createServiceClient } from './clients';

describe('핵심 테이블의 데이터 제약', () => {
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
      p_contact_value: '01099998881',
      p_convenience_store: 'gs25',
      p_promotion_type: 'one_plus_one',
      p_evidence_image: 'anonymous/schema/invalid-result.png',
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

  afterAll(async () => {
    if (saleRequestId) {
      await serviceClient
        .from('sale_requests')
        .delete()
        .eq('sale_request_id', saleRequestId);
    }
  });

  test('pending item은 purchase_evidence를 가질 수 없다', async () => {
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
  ])('새 stored item은 필수 상품 필드 %s를 비워둘 수 없다', async (missingField) => {
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

  test('stored item의 유효기간은 비워둘 수 있다', async () => {
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

  test('동일한 contact_type과 contact_value 조합은 중복될 수 없다', async () => {
    const { error } = await serviceClient.from('sellers').insert({
      contact_type: 'phone',
      contact_value: '01099998881',
    });

    expect(error).not.toBeNull();
  });

  test.each([
    ['convenience_store', 'seven11'],
    ['promotion_type', 'three_plus_one'],
    ['status', 'unknown'],
  ])('sale_requests의 %s 허용 목록 밖 값은 거부한다', async (field, value) => {
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
  ])('stored_items의 핵심 값 제약을 위반하면 거부한다', async (values) => {
    const { error } = await serviceClient.from('stored_items').insert({
      sale_request_id: saleRequestId,
      product_name: '잘못된 스키마 값 상품',
      expiration_date: '2026-12-01',
      ...values,
    });

    expect(error).not.toBeNull();
  });

  test('recruitment_settings는 open 상태의 singleton을 유지한다', async () => {
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
