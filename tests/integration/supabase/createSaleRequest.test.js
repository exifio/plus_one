/** @jest-environment node */

import { createAnonClient } from './clients';

describe('create_sale_request RPC', () => {
  let anonClient;

  beforeAll(() => {
    anonClient = createAnonClient();
  });

  test('creates seller, sale_request, and stored_items in one call', async () => {
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

  test('reuses existing seller for same contact', async () => {
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

  test('rejects invalid convenience_store', async () => {
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

  test('rejects empty items array', async () => {
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
});
