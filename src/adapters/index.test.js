import { createAppAdapters } from './index';

describe('앱 adapter composition root', () => {
  test('Supabase 설정이 없으면 기존 fixture adapter를 사용한다', () => {
    const clientFactory = jest.fn();
    const adapters = createAppAdapters({}, clientFactory);

    expect(clientFactory).not.toHaveBeenCalled();
    expect(adapters.saleRequestApi.getRecruitmentStatus).toBeDefined();
  });

  test('Supabase 설정이 있으면 모집과 판매 신청 adapter를 실제 구현으로 교체한다', async () => {
    const upload = jest.fn(async () => ({
      data: { path: 'anonymous/evidence-id' },
      error: null,
    }));
    const client = {
      auth: {
        getSession: jest.fn(async () => ({
          data: { session: { access_token: 'admin-access-token' } },
          error: null,
        })),
      },
      rpc: jest.fn(async (name) => name === 'get_recruitment_status'
        ? { data: 'paused', error: null }
        : {
            data: {
              sale_request_id: 'sale-request-id',
              seller_id: 'seller-id',
              items_count: 1,
            },
            error: null,
          }),
      storage: { from: jest.fn(() => ({ upload })) },
      functions: {
        invoke: jest.fn(async () => ({ data: { status: 'closed' }, error: null })),
      },
    };
    const clientFactory = jest.fn(() => client);
    const adapters = createAppAdapters(
      { VITE_SUPABASE_URL: 'https://example.supabase.co', VITE_SUPABASE_ANON_KEY: 'public-key' },
      clientFactory,
    );

    expect(clientFactory).toHaveBeenCalledWith('https://example.supabase.co', 'public-key');
    await expect(adapters.saleRequestApi.getRecruitmentStatus()).resolves.toEqual({ status: 'paused' });
    await expect(adapters.adminApi.getRecruitmentStatus()).resolves.toEqual({ status: 'closed' });
    await expect(adapters.adminApi.updateRecruitmentStatus('closed')).resolves.toBe('closed');
    await expect(adapters.saleRequestApi.submitSaleRequest({
      registrationMethod: 'manual',
      convenienceStore: 'gs25',
      promotionType: 'one_plus_one',
      items: [{
        productName: '콜라',
        expirationDate: '',
        originalPrice: 2000,
        askingPrice: 1000,
      }],
      contactType: 'phone',
      contactValue: '010-1234-5678',
      evidenceImage: null,
    })).resolves.toEqual({
      saleRequestId: 'sale-request-id',
      sellerId: 'seller-id',
      itemsCount: 1,
    });
    expect(adapters.adminApi.getSaleRequests).toBeDefined();
  });
});
