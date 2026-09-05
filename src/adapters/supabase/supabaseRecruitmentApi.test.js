import { createSupabaseRecruitmentApis } from './supabaseRecruitmentApi';

function createClient({ rpcResult, invokeResult }) {
  return {
    rpc: jest.fn(async () => rpcResult),
    functions: {
      invoke: jest.fn(async () => invokeResult),
    },
  };
}

describe('Supabase 모집 상태 API', () => {
  test('판매자 상태 조회는 공개 RPC 결과를 계약 shape으로 반환한다', async () => {
    const client = createClient({ rpcResult: { data: 'paused', error: null } });
    const { saleRequestApi } = createSupabaseRecruitmentApis(client);

    await expect(saleRequestApi.getRecruitmentStatus()).resolves.toEqual({ status: 'paused' });
    expect(client.rpc).toHaveBeenCalledWith('get_recruitment_status');
  });

  test('판매자 공개 RPC 오류 또는 잘못된 상태는 실패한다', async () => {
    const rpc = jest.fn()
      .mockResolvedValueOnce({ data: null, error: new Error('network') })
      .mockResolvedValueOnce({ data: null, error: null });
    const client = {
      rpc,
      functions: { invoke: jest.fn() },
    };
    const { saleRequestApi } = createSupabaseRecruitmentApis(client);

    await expect(saleRequestApi.getRecruitmentStatus()).rejects.toThrow();
    await expect(saleRequestApi.getRecruitmentStatus()).rejects.toThrow();
  });

  test('관리자 상태 조회는 Auth Edge Function을 호출한다', async () => {
    const client = createClient({ invokeResult: { data: { status: 'closed' }, error: null } });
    const { adminRecruitmentApi } = createSupabaseRecruitmentApis(client);

    await expect(adminRecruitmentApi.getRecruitmentStatus()).resolves.toEqual({ status: 'closed' });
    expect(client.functions.invoke).toHaveBeenCalledWith('admin-api', {
      body: { action: 'getRecruitmentStatus' },
    });
  });

  test('관리자 상태 변경은 유효한 값만 Auth Edge Function으로 전달한다', async () => {
    const client = createClient({ invokeResult: { data: { status: 'paused' }, error: null } });
    const { adminRecruitmentApi } = createSupabaseRecruitmentApis(client);

    await expect(adminRecruitmentApi.updateRecruitmentStatus('paused')).resolves.toBe('paused');
    expect(client.functions.invoke).toHaveBeenCalledWith('admin-api', {
      body: { action: 'updateRecruitmentStatus', status: 'paused' },
    });
  });

  test('관리자 Edge Function 오류 또는 잘못된 응답은 실패한다', async () => {
    const invoke = jest.fn()
      .mockResolvedValueOnce({ data: null, error: new Error('unauthorized') })
      .mockResolvedValueOnce({ data: { status: 'unknown' }, error: null });
    const client = { rpc: jest.fn(), functions: { invoke } };
    const { adminRecruitmentApi } = createSupabaseRecruitmentApis(client);

    await expect(adminRecruitmentApi.getRecruitmentStatus()).rejects.toThrow();
    await expect(adminRecruitmentApi.getRecruitmentStatus()).rejects.toThrow();
  });
});
