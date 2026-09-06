/** @jest-environment node */

import { createSupabaseSubmissionApis } from '../../../src/adapters/supabase/supabaseSubmissionApi';
import { createSubmitSaleRequestService } from '../../../src/features/seller/services/submitSaleRequest';
import { createAnonClient, createServiceClient } from './clients';
import { TEST_CONTACT, TEST_STORAGE_FILES } from './testFixtures';

test('실제 서버에서 스크린샷을 올린 뒤 신청이 저장되는지 확인한다', async () => {
  const anonClient = createAnonClient();
  const serviceClient = createServiceClient();
  const objectPath = TEST_STORAGE_FILES['sale-evidence'][0];
  const submissionApi = createSupabaseSubmissionApis(
    anonClient,
    () => objectPath.replace('anonymous/', ''),
  );
  const submit = createSubmitSaleRequestService({
    storageApi: submissionApi,
    saleRequestApi: submissionApi,
    today: '2026-09-06',
  });
  const image = Object.assign(new Uint8Array([137, 80, 78, 71]), { type: 'image/png' });

  const result = await submit({
    registrationMethod: 'screenshot',
    convenienceStore: 'gs25',
    promotionType: 'one_plus_one',
    items: [{ productName: '', expirationDate: '', originalPrice: null, askingPrice: 700 }],
    contactType: 'phone',
    contactValue: TEST_CONTACT.CREATE_SALE_PRIMARY,
    evidenceImage: image,
  });

  expect(result).toEqual({
    ok: true,
    data: expect.objectContaining({ itemsCount: 1 }),
  });

  const { data: request, error } = await serviceClient
    .from('sale_requests')
    .select('registration_method, evidence_image, stored_items(product_name, original_price, asking_price)')
    .eq('sale_request_id', result.data.saleRequestId)
    .single();
  expect(error).toBeNull();
  expect(request).toEqual({
    registration_method: 'screenshot',
    evidence_image: objectPath,
    stored_items: [{ product_name: null, original_price: null, asking_price: 700 }],
  });
});
