import { createSupabaseSubmissionApis } from './supabaseSubmissionApi';

const manualDraft = {
  registrationMethod: 'manual',
  convenienceStore: 'gs25',
  promotionType: 'one_plus_one',
  items: [{
    productName: '코카콜라 500ml',
    expirationDate: '',
    originalPrice: 2200,
    askingPrice: 1000,
  }],
  contactType: 'phone',
  contactValue: '010-1234-5678',
  evidenceImage: null,
};

function createClient(rpcResult = {
  data: {
    sale_request_id: 'sale-request-id',
    seller_id: 'seller-id',
    items_count: 1,
  },
  error: null,
}) {
  return {
    rpc: jest.fn(async () => rpcResult),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(async () => ({
          data: { path: 'anonymous/evidence-id' },
          error: null,
        })),
      })),
    },
  };
}

describe('Supabase 판매 신청 API', () => {
  test('현재 7인자 RPC 계약으로 직접 입력 신청을 제출한다', async () => {
    const client = createClient();
    const { submitSaleRequest } = createSupabaseSubmissionApis(client, () => 'evidence-id');

    await expect(submitSaleRequest(manualDraft)).resolves.toEqual({
      saleRequestId: 'sale-request-id',
      sellerId: 'seller-id',
      itemsCount: 1,
    });
    expect(client.rpc).toHaveBeenCalledWith('create_sale_request', {
      p_contact_type: 'phone',
      p_contact_value: '01012345678',
      p_convenience_store: 'gs25',
      p_promotion_type: 'one_plus_one',
      p_evidence_image: null,
      p_items: [{
        product_name: '코카콜라 500ml',
        expiration_date: null,
        original_price: 2200,
        asking_price: 1000,
      }],
      p_registration_method: 'manual',
    });
  });

  test('판매 증빙은 private bucket의 anonymous 경로에 업로드한다', async () => {
    const client = createClient();
    const upload = client.storage.from().upload;
    client.storage.from.mockReturnValue({ upload });
    const { uploadEvidence } = createSupabaseSubmissionApis(client, () => 'evidence-id');
    const image = new File(['image'], 'evidence.png', { type: 'image/png' });

    await expect(uploadEvidence(image)).resolves.toBe('anonymous/evidence-id');
    expect(client.storage.from).toHaveBeenCalledWith('sale-evidence');
    expect(upload).toHaveBeenCalledWith('anonymous/evidence-id', image, {
      contentType: 'image/png',
      upsert: false,
    });
  });

  test('모집 중단과 일반 RPC 오류를 안전한 코드로 구분한다', async () => {
    const stoppedClient = createClient({
      data: null,
      error: new Error('RECRUITMENT_NOT_OPEN'),
    });
    const failedClient = createClient({ data: null, error: new Error('database detail') });

    await expect(
      createSupabaseSubmissionApis(stoppedClient).submitSaleRequest(manualDraft),
    ).rejects.toMatchObject({ code: 'RECRUITMENT_NOT_OPEN' });
    await expect(
      createSupabaseSubmissionApis(failedClient).submitSaleRequest(manualDraft),
    ).rejects.toMatchObject({ code: 'SALE_REQUEST_SUBMIT_FAILED' });
  });
});
