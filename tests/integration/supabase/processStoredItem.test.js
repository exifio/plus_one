/** @jest-environment node */

import { createAnonClient, createServiceClient } from './clients';

describe('process_stored_item RPC', () => {
  let serviceClient;

  beforeAll(() => {
    serviceClient = createServiceClient();
  });

  let saleRequestId;
  let storedItemId;

  beforeAll(async () => {
    const { data } = await serviceClient.rpc('create_sale_request', {
      p_contact_type: 'phone',
      p_contact_value: '01033334444',
      p_convenience_store: 'cu',
      p_promotion_type: 'two_plus_one',
      p_evidence_image: 'anonymous/test/uuid-psi.png',
      p_items: [
        {
          product_name: '블라썸오리지널 350ml',
          expiration_date: '2026-10-10',
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

  test('purchase requires purchase_evidence', async () => {
    const { error } = await serviceClient.rpc('process_stored_item', {
      p_stored_item_id: storedItemId,
      p_result: 'purchased',
      p_purchase_evidence: null,
      p_rejection_reason: null,
    });
    expect(error).not.toBeNull();
    expect(error.message).toMatch(/evidence/i);
  });

  test('purchase with evidence succeeds', async () => {
    const { data, error } = await serviceClient.rpc('process_stored_item', {
      p_stored_item_id: storedItemId,
      p_result: 'purchased',
      p_purchase_evidence: 'admin/test/purchase.jpg',
      p_rejection_reason: null,
    });
    expect(error).toBeNull();
    expect(data).toBe('contacting');
  });

  test('rejection requires rejection_reason', async () => {
    // Create a new stored item for rejection test
    const { data } = await serviceClient.rpc('create_sale_request', {
      p_contact_type: 'phone',
      p_contact_value: '01055556666',
      p_convenience_store: 'gs25',
      p_promotion_type: 'one_plus_one',
      p_evidence_image: 'anonymous/test/uuid-rej.png',
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

  test('rejection with reason succeeds', async () => {
    const { data: newSr } = await serviceClient.rpc('create_sale_request', {
      p_contact_type: 'phone',
      p_contact_value: '01077778888',
      p_convenience_store: 'cu',
      p_promotion_type: 'two_plus_one',
      p_evidence_image: 'anonymous/test/uuid-rej2.png',
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
    expect(data).toBe('completed'); // last item -> completed
  });
});
