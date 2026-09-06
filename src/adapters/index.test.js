import { createAppAdapters } from './index';

describe('앱이 실제 서버를 쓸지 로컬 연습 데이터를 쓸지', () => {
  test('서버 주소가 없으면 로컬 연습 데이터로 화면을 돌린다', () => {
    const clientFactory = jest.fn();
    const adapters = createAppAdapters({}, clientFactory);

    expect(clientFactory).not.toHaveBeenCalled();
    expect(adapters.saleRequestApi.getRecruitmentStatus).toBeDefined();
  });

  test('서버 주소가 있으면 모집 조회와 판매 신청을 실제 서버로 보낸다', async () => {
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

  test('관리자가 로그인해 있어도 판매 신청은 관리자 로그인 정보를 쓰지 않는다', async () => {
    const createClient = () => {
      const upload = jest.fn(async () => ({
        data: { path: 'anonymous/evidence-id' },
        error: null,
      }));
      return {
        auth: {
          getSession: jest.fn(async () => ({
            data: { session: { access_token: 'admin-access-token' } },
            error: null,
          })),
        },
        rpc: jest.fn(async () => ({ data: 'open', error: null })),
        storage: { from: jest.fn(() => ({ upload })) },
        functions: {
          invoke: jest.fn(async () => ({ data: { status: 'open' }, error: null })),
        },
      };
    };
    const publicClient = createClient();
    const adminClient = createClient();
    const clientFactory = jest.fn()
      .mockReturnValueOnce(publicClient)
      .mockReturnValueOnce(adminClient);
    const url = 'https://example.supabase.co';

    const adapters = createAppAdapters(
      { VITE_SUPABASE_URL: url, VITE_SUPABASE_ANON_KEY: 'public-key' },
      clientFactory,
    );

    expect(clientFactory).toHaveBeenNthCalledWith(1, url, 'public-key', {
      auth: { persistSession: false },
    });
    expect(clientFactory).toHaveBeenNthCalledWith(2, url, 'public-key');

    await adapters.storageApi.uploadEvidence(
      new File(['image'], 'evidence.png', { type: 'image/png' }),
    );
    await adapters.adminApi.getRecruitmentStatus();

    expect(publicClient.storage.from).toHaveBeenCalledWith('sale-evidence');
    expect(publicClient.auth.getSession).not.toHaveBeenCalled();
    expect(adminClient.auth.getSession).toHaveBeenCalled();
  });
});
