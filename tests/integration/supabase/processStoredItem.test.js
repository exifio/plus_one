/** @jest-environment node */

/*
 * 관련 작업: BE-6 — 관리자 보관상품 구매·거절 처리와 자동 완료.
 * 작성 이유: 상품 결과를 한 번 확정하면 되돌릴 수 없고, 필요한 증빙·사유가 없으면 저장하면 안 되기 때문.
 * 확인 내용: 구매·거절 필수값, 최종 결과 재처리 차단, 마지막 상품 처리 후 completed 전환.
 */
import { createAnonClient, createServiceClient } from './clients';
import { TEST_CONTACT } from './testFixtures';

describe('구매·거절은 한 번만 확정되고 마지막 상품이면 신청도 끝나는지', () => {
  let serviceClient;

  beforeAll(() => {
    serviceClient = createServiceClient();
  });

  let saleRequestId;
  let storedItemId;

  beforeAll(async () => {
    const { data } = await serviceClient.rpc('create_sale_request', {
      p_contact_type: 'phone',
      p_contact_value: TEST_CONTACT.PROCESS_STORED_ITEM_PRIMARY,
      p_convenience_store: 'cu',
      p_promotion_type: 'two_plus_one',
      p_evidence_image: 'anonymous/test/uuid-psi.png',
      p_registration_method: 'manual',
      p_items: [
        {
          product_name: '블라썸오리지널 350ml',
          expiration_date: '2026-10-10',
          original_price: 1800,
          asking_price: 800,
        },
        {
          product_name: '블라썸라이트 350ml',
          expiration_date: '2026-10-11',
          original_price: 1800,
          asking_price: 800,
        },
      ],
    });
    saleRequestId = data.sale_request_id;

    const { data: items } = await serviceClient
      .from('stored_items')
      .select('stored_item_id')
      .eq('sale_request_id', saleRequestId);
    storedItemId = items[0].stored_item_id;
  });

  test('구매로 바꾸려면 구매 증빙이 있어야 한다', async () => {
    const { error } = await serviceClient.rpc('process_stored_item', {
      p_stored_item_id: storedItemId,
      p_result: 'purchased',
      p_purchase_evidence: null,
      p_rejection_reason: null,
    });
    expect(error).not.toBeNull();
    expect(error.message).toMatch(/evidence/i);
  });

  test('구매 증빙이 있으면 그 상품을 구매로 바꿀 수 있다', async () => {
    const { data, error } = await serviceClient.rpc('process_stored_item', {
      p_stored_item_id: storedItemId,
      p_result: 'purchased',
      p_purchase_evidence: 'admin/test/purchase.jpg',
      p_rejection_reason: null,
    });
    expect(error).toBeNull();
    expect(data).toBe('contacting');
  });

  test('한 번 처리한 상품은 다시 바꾸지 않는다', async () => {
    const { data, error } = await serviceClient.rpc('process_stored_item', {
      p_stored_item_id: storedItemId,
      p_result: 'rejected',
      p_purchase_evidence: null,
      p_rejection_reason: '재처리 불가 확인',
    });

    if (error === null) {
      await serviceClient
        .from('stored_items')
        .update({
          result: 'purchased',
          purchase_evidence: 'admin/test/purchase.jpg',
          rejection_reason: null,
        })
        .eq('stored_item_id', storedItemId);
    }

    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });

  test('거절로 바꾸려면 거절 이유가 있어야 한다', async () => {
    // 거절 테스트용 stored item을 새로 만든다
    const { data } = await serviceClient.rpc('create_sale_request', {
      p_contact_type: 'phone',
      p_contact_value: TEST_CONTACT.PROCESS_STORED_ITEM_REJECT,
      p_convenience_store: 'gs25',
      p_promotion_type: 'one_plus_one',
      p_evidence_image: 'anonymous/test/uuid-rej.png',
      p_registration_method: 'manual',
      p_items: [
        {
          product_name: '비타500 100ml',
          expiration_date: '2026-11-01',
          original_price: 1000,
          asking_price: 400,
        },
      ],
    });

    const { data: items } = await serviceClient
      .from('stored_items')
      .select('stored_item_id')
      .eq('sale_request_id', data.sale_request_id);
    const itemId = items[0].stored_item_id;

    const { error } = await serviceClient.rpc('process_stored_item', {
      p_stored_item_id: itemId,
      p_result: 'rejected',
      p_purchase_evidence: null,
      p_rejection_reason: '',
    });
    expect(error).not.toBeNull();
    expect(error.message).toMatch(/reason/i);
  });

  test('거절 이유가 있으면 그 상품을 거절로 바꾸고, 마지막이면 신청도 처리완료로 바꾼다', async () => {
    const { data: newSr } = await serviceClient.rpc('create_sale_request', {
      p_contact_type: 'phone',
      p_contact_value: TEST_CONTACT.PROCESS_STORED_ITEM_REJECT_SUCCESS,
      p_convenience_store: 'cu',
      p_promotion_type: 'two_plus_one',
      p_evidence_image: 'anonymous/test/uuid-rej2.png',
      p_registration_method: 'manual',
      p_items: [
        {
          product_name: '트레비 250ml',
          expiration_date: '2026-09-30',
          original_price: 1300,
          asking_price: 600,
        },
      ],
    });

    const { data: items } = await serviceClient
      .from('stored_items')
      .select('stored_item_id')
      .eq('sale_request_id', newSr.sale_request_id);
    const itemId = items[0].stored_item_id;

    const { data, error } = await serviceClient.rpc('process_stored_item', {
      p_stored_item_id: itemId,
      p_result: 'rejected',
      p_purchase_evidence: null,
      p_rejection_reason: '상품이 이미 팔렸습니다',
    });
    expect(error).toBeNull();
    expect(data).toBe('completed'); // 마지막 item → completed
  });
});
