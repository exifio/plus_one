/** @jest-environment node */

/*
 * 관련 작업: BE-4 — create_sale_request 트랜잭션 RPC.
 * 작성 이유: Seller·신청·상품을 한 번에 저장하고 중간 실패 때 일부 데이터가 남지 않아야 하기 때문.
 * 확인 내용: 등록 방식별 정상 생성, Seller 재사용, 입력 거부, rollback, 조건부 증빙·상품 정보.
 */
import { createAnonClient, createServiceClient } from './clients';
import {
  TEST_CONTACT,
} from './testFixtures';

describe('판매 신청 한 번에 판매자·신청·상품이 함께 저장되는지', () => {
  let anonClient;
  let serviceClient;

  beforeAll(() => {
    anonClient = createAnonClient();
    serviceClient = createServiceClient();
  });

  test('한 번 신청하면 판매자·신청·상품이 함께 만들어진다', async () => {
    const { data, error } = await anonClient.rpc('create_sale_request', {
      p_contact_type: 'phone',
      p_contact_value: TEST_CONTACT.CREATE_SALE_PRIMARY,
      p_convenience_store: 'gs25',
      p_promotion_type: 'one_plus_one',
      p_evidence_image: null,
      p_items: [
        {
          product_name: '코카콜라 500ml',
          expiration_date: '2026-09-30',
          original_price: 2200,
          asking_price: 1000,
        },
      ],
      p_registration_method: 'manual',
    });

    expect(error).toBeNull();
    expect(data).toHaveProperty('sale_request_id');
    expect(data).toHaveProperty('seller_id');
    expect(data.items_count).toBe(1);

    const [{ data: request }, { data: items }] = await Promise.all([
      serviceClient
        .from('sale_requests')
        .select('registration_method, evidence_image')
        .eq('sale_request_id', data.sale_request_id)
        .single(),
      serviceClient
        .from('stored_items')
        .select('product_name, original_price, asking_price')
        .eq('sale_request_id', data.sale_request_id),
    ]);
    expect(request).toEqual({ registration_method: 'manual', evidence_image: null });
    expect(items).toEqual([{
      product_name: '코카콜라 500ml',
      original_price: 2200,
      asking_price: 1000,
    }]);
  });

  test('스크린샷 신청은 사진과 희망 가격만 저장한다', async () => {
    const evidenceImage = 'anonymous/test-user/screenshot.png';
    const { data, error } = await anonClient.rpc('create_sale_request', {
      p_contact_type: 'phone',
      p_contact_value: TEST_CONTACT.CREATE_SALE_PRIMARY,
      p_convenience_store: 'cu',
      p_promotion_type: 'two_plus_one',
      p_evidence_image: evidenceImage,
      p_items: [{
        product_name: null,
        expiration_date: null,
        original_price: null,
        asking_price: 700,
      }],
      p_registration_method: 'screenshot',
    });

    expect(error).toBeNull();

    const [{ data: request }, { data: items }] = await Promise.all([
      serviceClient
        .from('sale_requests')
        .select('registration_method, evidence_image')
        .eq('sale_request_id', data.sale_request_id)
        .single(),
      serviceClient
        .from('stored_items')
        .select('product_name, expiration_date, original_price, asking_price')
        .eq('sale_request_id', data.sale_request_id),
    ]);
    expect(request).toEqual({
      registration_method: 'screenshot',
      evidence_image: evidenceImage,
    });
    expect(items).toEqual([{
      product_name: null,
      expiration_date: null,
      original_price: null,
      asking_price: 700,
    }]);
  });

  test('같은 연락처로 다시 신청하면 기존 판매자를 재사용한다', async () => {
    const payload = {
      p_contact_type: 'phone',
      p_contact_value: TEST_CONTACT.CREATE_SALE_PRIMARY,
      p_convenience_store: 'cu',
      p_promotion_type: 'two_plus_one',
      p_evidence_image: null,
      p_items: [
        {
          product_name: '박카스 240ml',
          expiration_date: '2026-10-15',
          original_price: 1500,
          asking_price: 500,
        },
      ],
      p_registration_method: 'manual',
    };

    const { data: first } = await anonClient.rpc('create_sale_request', payload);
    const { data: second } = await anonClient.rpc('create_sale_request', payload);

    expect(first.seller_id).toBe(second.seller_id);
    expect(first.sale_request_id).not.toBe(second.sale_request_id);
  });

  test('정해지지 않은 편의점은 신청을 저장하지 않는다', async () => {
    const { error } = await anonClient.rpc('create_sale_request', {
      p_contact_type: 'phone',
      p_contact_value: TEST_CONTACT.CREATE_SALE_INVALID_STORE,
      p_convenience_store: 'seven11',
      p_promotion_type: 'one_plus_one',
      p_evidence_image: 'anonymous/test/uuid.png',
      p_items: [],
      p_registration_method: 'manual',
    });

    expect(error).not.toBeNull();
  });

  test('상품이 없으면 신청을 저장하지 않는다', async () => {
    const { error } = await anonClient.rpc('create_sale_request', {
      p_contact_type: 'phone',
      p_contact_value: TEST_CONTACT.CREATE_SALE_EMPTY_ITEMS,
      p_convenience_store: 'gs25',
      p_promotion_type: 'one_plus_one',
      p_evidence_image: 'anonymous/test/uuid.png',
      p_items: [],
      p_registration_method: 'manual',
    });

    expect(error).not.toBeNull();
  });

  test('상품이 잘못되면 판매자와 신청도 같이 되돌린다', async () => {
    const contactValue = TEST_CONTACT.CREATE_SALE_ROLLBACK;

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
      p_registration_method: 'manual',
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

  test('스크린샷 신청인데 사진이 없으면 저장하지 않는다', async () => {
    const { error } = await anonClient.rpc('create_sale_request', {
      p_contact_type: 'phone',
      p_contact_value: TEST_CONTACT.CREATE_SALE_NO_EVIDENCE,
      p_convenience_store: 'gs25',
      p_promotion_type: 'one_plus_one',
      p_evidence_image: null,
      p_items: [{
        product_name: null,
        expiration_date: null,
        original_price: null,
        asking_price: 600,
      }],
      p_registration_method: 'screenshot',
    });

    expect(error).not.toBeNull();
  });

  test('유효기간을 비워도 신청을 저장할 수 있다', async () => {
    const { data, error } = await anonClient.rpc('create_sale_request', {
      p_contact_type: 'phone',
      p_contact_value: TEST_CONTACT.CREATE_SALE_NO_EXPIRATION,
      p_convenience_store: 'cu',
      p_promotion_type: 'two_plus_one',
      p_evidence_image: 'anonymous/test/screenshot.png',
      p_items: [{
        product_name: '수박바',
        expiration_date: null,
        original_price: 1200,
        asking_price: 600,
      }],
      p_registration_method: 'manual',
    });

    expect(error).toBeNull();
    expect(data).toHaveProperty('sale_request_id');
  });

  test('스크린샷·직접 입력이 아닌 등록 방식은 저장하지 않는다', async () => {
    const { error } = await anonClient.rpc('create_sale_request', {
      p_contact_type: 'phone',
      p_contact_value: TEST_CONTACT.CREATE_SALE_NO_EVIDENCE,
      p_convenience_store: 'gs25',
      p_promotion_type: 'one_plus_one',
      p_evidence_image: null,
      p_items: [{
        product_name: '수박바',
        expiration_date: null,
        original_price: 1200,
        asking_price: 600,
      }],
      p_registration_method: 'unknown',
    });

    expect(error).not.toBeNull();
  });
});
