/** @jest-environment node */

import { createAnonClient, createServiceClient } from './clients';

describe('RLS — anonymous access denied', () => {
  let anonClient;
  let serviceClient;

  beforeAll(() => {
    anonClient = createAnonClient();
    serviceClient = createServiceClient();
  });

  test('anon cannot select sellers', async () => {
    const { error } = await anonClient.from('sellers').select('*');
    expect(error).not.toBeNull();
    expect(error.code).toBe('42501'); // permission denied
  });

  test('anon cannot select sale_requests', async () => {
    const { error } = await anonClient.from('sale_requests').select('*');
    expect(error).not.toBeNull();
    expect(error.code).toBe('42501');
  });

  test('anon cannot select stored_items', async () => {
    const { error } = await anonClient.from('stored_items').select('*');
    expect(error).not.toBeNull();
    expect(error.code).toBe('42501');
  });

  test('anon cannot insert into sellers', async () => {
    const { error } = await anonClient.from('sellers').insert({
      contact_type: 'phone',
      contact_value: '01099990000',
    });
    expect(error).not.toBeNull();
  });

  test('service_role can select sellers', async () => {
    const { error } = await serviceClient.from('sellers').select('*').limit(1);
    // no error means policy allows it (or table is empty)
    expect(error).toBeNull();
  });
});
