/** @jest-environment node */

import { createAnonClient, createServiceClient } from './clients';

describe('start_contact RPC', () => {
  let anonClient;
  let serviceClient;

  beforeAll(() => {
    anonClient = createAnonClient();
    serviceClient = createServiceClient();
  });

  test('anon cannot call start_contact', async () => {
    const { error } = await anonClient.rpc('start_contact', {
      p_sale_request_id: '00000000-0000-0000-0000-000000000001',
    });
    expect(error).not.toBeNull();
  });

  test('service_role can transition received to contacting', async () => {
    // Create a sale request first via RPC
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
});
