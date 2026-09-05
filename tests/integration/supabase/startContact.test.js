/** @jest-environment node */

/*
 * 관련 작업: BE-6 — 관리자 연락 시작 상태 전이.
 * 작성 이유: 접수된 신청만 contacting으로 한 번 전환할 수 있고 비로그인 호출은 막아야 하기 때문.
 * 확인 내용: anon 차단, received → contacting 성공, 중복 전환 실패.
 */
import { createAnonClient, createServiceClient } from './clients';

describe('연락 시작 RPC', () => {
  let anonClient;
  let serviceClient;

  beforeAll(() => {
    anonClient = createAnonClient();
    serviceClient = createServiceClient();
  });

  test('anon은 start_contact를 호출할 수 없다', async () => {
    const { error } = await anonClient.rpc('start_contact', {
      p_sale_request_id: '00000000-0000-0000-0000-000000000001',
    });
    expect(error).not.toBeNull();
  });

  test('service_role은 received를 contacting으로 전환할 수 있다', async () => {
    // RPC로 sale request를 먼저 생성한다
    const { data: sr } = await serviceClient.rpc('create_sale_request', {
      p_contact_type: 'phone',
      p_contact_value: '01011112222',
      p_convenience_store: 'gs25',
      p_promotion_type: 'one_plus_one',
      p_evidence_image: 'anonymous/test/uuid-sc.png',
      p_items: [
        {
          product_name: '웰치스 500ml',
          expiration_date: '2026-10-01',
          original_price: 2000,
          asking_price: 900,
        },
      ],
    });

    const result = await serviceClient.rpc('start_contact', {
      p_sale_request_id: sr.sale_request_id,
    });

    expect(result.error).toBeNull();
    expect(result.data).toBe('contacting');
  });

  test('이미 contacting인 신청은 다시 연락 시작 처리할 수 없다', async () => {
    const { data: sr, error: createError } = await serviceClient.rpc('create_sale_request', {
      p_contact_type: 'phone',
      p_contact_value: '01011112223',
      p_convenience_store: 'cu',
      p_promotion_type: 'two_plus_one',
      p_evidence_image: 'anonymous/test/uuid-sc-duplicate.png',
      p_items: [
        {
          product_name: '중복 연락 시작 테스트 상품',
          expiration_date: '2026-10-01',
          original_price: 2000,
          asking_price: 900,
        },
      ],
    });
    expect(createError).toBeNull();

    const first = await serviceClient.rpc('start_contact', {
      p_sale_request_id: sr.sale_request_id,
    });
    expect(first.error).toBeNull();

    const second = await serviceClient.rpc('start_contact', {
      p_sale_request_id: sr.sale_request_id,
    });
    expect(second.error).not.toBeNull();
  });
});
