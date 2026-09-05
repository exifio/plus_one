/** @jest-environment node */

/*
 * 관련 작업: BE-4 — create_sale_request 트랜잭션 RPC.
 * 작성 이유: Seller·신청·상품을 한 번에 저장하고 중간 실패 때 일부 데이터가 남지 않아야 하기 때문.
 * 확인 내용: 정상 생성, Seller 재사용, 입력 거부, rollback, 필수 증빙·상품 정보.
 */
import { createAnonClient, createServiceClient } from './clients';

describe('create_sale_request RPC', () => {
  let anonClient;
  let serviceClient;

  beforeAll(() => {
    anonClient = createAnonClient();
    serviceClient = createServiceClient();
  });

  test('한 번의 호출로 seller, sale_request, stored_items를 생성한다', async () => {
    const { data, error } = await anonClient.rpc('create_sale_request', {
      p_contact_type: 'phone',
      p_contact_value: '01012345678',
      p_convenience_store: 'gs25',
      p_promotion_type: 'one_plus_one',
      p_evidence_image: 'anonymous/test-user/uuid.png',
      p_items: [
        {
          product_name: '코카콜라 500ml',
          expiration_date: '2026-09-30',
          original_price: 2200,
          asking_price: 1000,
        },
      ],
    });

    expect(error).toBeNull();
    expect(data).toHaveProperty('sale_request_id');
    expect(data).toHaveProperty('seller_id');
    expect(data.items_count).toBe(1);
  });

  test('같은 연락처면 기존 seller를 재사용한다', async () => {
    const payload = {
      p_contact_type: 'phone',
      p_contact_value: '01012345678',
      p_convenience_store: 'cu',
      p_promotion_type: 'two_plus_one',
      p_evidence_image: 'anonymous/test-user2/uuid2.png',
      p_items: [
        {
          product_name: '박카스 240ml',
          expiration_date: '2026-10-15',
          original_price: 1500,
          asking_price: 500,
        },
      ],
    };

    const { data: first } = await anonClient.rpc('create_sale_request', payload);
    const { data: second } = await anonClient.rpc('create_sale_request', payload);

    expect(first.seller_id).toBe(second.seller_id);
    expect(first.sale_request_id).not.toBe(second.sale_request_id);
  });

  test('잘못된 convenience_store는 거부한다', async () => {
    const { error } = await anonClient.rpc('create_sale_request', {
      p_contact_type: 'phone',
      p_contact_value: '01000000001',
      p_convenience_store: 'seven11',
      p_promotion_type: 'one_plus_one',
      p_evidence_image: 'anonymous/test/uuid.png',
      p_items: [],
    });

    expect(error).not.toBeNull();
  });

  test('빈 items 배열은 거부한다', async () => {
    const { error } = await anonClient.rpc('create_sale_request', {
      p_contact_type: 'phone',
      p_contact_value: '01000000002',
      p_convenience_store: 'gs25',
      p_promotion_type: 'one_plus_one',
      p_evidence_image: 'anonymous/test/uuid.png',
      p_items: [],
    });

    expect(error).not.toBeNull();
  });

  test('StoredItem 검증 실패 시 seller와 sale_request를 함께 rollback한다', async () => {
    const contactValue = '01000000005';

    const { error } = await anonClient.rpc('create_sale_request', {
      p_contact_type: 'phone',
      p_contact_value: '010-0000-0005',
      p_convenience_store: 'gs25',
      p_promotion_type: 'one_plus_one',
      p_evidence_image: 'anonymous/test/rollback.png',
      p_items: [{
        product_name: '',
        expiration_date: '2026-09-30',
        original_price: 1200,
        asking_price: 600,
      }],
    });

    expect(error).not.toBeNull();

    const { data: sellers, error: sellerError } = await serviceClient
      .from('sellers')
      .select('seller_id')
      .eq('contact_type', 'phone')
      .eq('contact_value', contactValue);
    expect(sellerError).toBeNull();
    expect(sellers).toHaveLength(0);
  });

  test('증빙 이미지가 없으면 등록을 거부한다', async () => {
    const { error } = await anonClient.rpc('create_sale_request', {
      p_contact_type: 'phone',
      p_contact_value: '01000000003',
      p_convenience_store: 'gs25',
      p_promotion_type: 'one_plus_one',
      p_evidence_image: null,
      p_items: [{
        product_name: '수박바',
        expiration_date: '2026-09-30',
        original_price: 1200,
        asking_price: 600,
      }],
    });

    expect(error).not.toBeNull();
  });

  test('상품 유효기간이 없으면 등록을 거부한다', async () => {
    const { error } = await anonClient.rpc('create_sale_request', {
      p_contact_type: 'phone',
      p_contact_value: '01000000004',
      p_convenience_store: 'cu',
      p_promotion_type: 'two_plus_one',
      p_evidence_image: 'anonymous/test/screenshot.png',
      p_items: [{
        product_name: '수박바',
        expiration_date: null,
        original_price: 1200,
        asking_price: 600,
      }],
    });

    expect(error).not.toBeNull();
  });
});
