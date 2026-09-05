import { createAppAdapters } from './index';

describe('앱 adapter composition root', () => {
  test('Supabase 설정이 없으면 기존 fixture adapter를 사용한다', () => {
    const clientFactory = jest.fn();
    const adapters = createAppAdapters({}, clientFactory);

    expect(clientFactory).not.toHaveBeenCalled();
    expect(adapters.saleRequestApi.getRecruitmentStatus).toBeDefined();
  });

  test('Supabase 설정이 있으면 모집 조회·변경만 실제 adapter로 교체한다', async () => {
    const client = {
      rpc: jest.fn(async () => ({ data: 'paused', error: null })),
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
    expect(adapters.saleRequestApi.submitSaleRequest).toBeDefined();
    expect(adapters.adminApi.getSaleRequests).toBeDefined();
  });
});
