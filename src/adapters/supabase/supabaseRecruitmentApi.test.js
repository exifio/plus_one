import { createSupabaseRecruitmentApis } from './supabaseRecruitmentApi';

function createClient({ rpcResult, invokeResult }) {
  return {
    auth: {
      getSession: jest.fn(async () => ({
        data: { session: { access_token: 'admin-access-token' } },
        error: null,
      })),
    },
    rpc: jest.fn(async () => rpcResult),
    functions: {
      invoke: jest.fn(async () => invokeResult),
    },
  };
}

describe('실제 서버의 모집 상태를 읽고 바꾸는 연결', () => {
  test('판매자는 공개 조회로 모집 중인지 확인할 수 있다', async () => {
    const client = createClient({ rpcResult: { data: 'paused', error: null } });
    const { saleRequestApi } = createSupabaseRecruitmentApis(client);

    await expect(saleRequestApi.getRecruitmentStatus()).resolves.toEqual({ status: 'paused' });
    expect(client.rpc).toHaveBeenCalledWith('get_recruitment_status');
  });

  test('모집 상태를 못 읽거나 값이 이상하면 실패로 돌린다', async () => {
    const rpc = jest.fn()
      .mockResolvedValueOnce({ data: null, error: new Error('network') })
      .mockResolvedValueOnce({ data: null, error: null });
    const client = {
      auth: {
        getSession: jest.fn(async () => ({
          data: { session: { access_token: 'admin-access-token' } },
          error: null,
        })),
      },
      rpc,
      functions: { invoke: jest.fn() },
    };
    const { saleRequestApi } = createSupabaseRecruitmentApis(client);

    await expect(saleRequestApi.getRecruitmentStatus()).rejects.toThrow();
    await expect(saleRequestApi.getRecruitmentStatus()).rejects.toThrow();
  });

  test('운영자 모집 조회는 로그인한 관리자 API로만 한다', async () => {
    const client = createClient({ invokeResult: { data: { status: 'closed' }, error: null } });
    const { adminRecruitmentApi } = createSupabaseRecruitmentApis(client);

    await expect(adminRecruitmentApi.getRecruitmentStatus()).resolves.toEqual({ status: 'closed' });
    expect(client.functions.invoke).toHaveBeenCalledWith('admin-api', {
      body: { action: 'getRecruitmentStatus' },
      headers: { Authorization: 'Bearer admin-access-token' },
    });
  });

  test('운영자는 모집 중·일시중지·마감만 관리자 API로 보낸다', async () => {
    const client = createClient({ invokeResult: { data: { status: 'paused' }, error: null } });
    const { adminRecruitmentApi } = createSupabaseRecruitmentApis(client);

    await expect(adminRecruitmentApi.updateRecruitmentStatus('paused')).resolves.toBe('paused');
    expect(client.functions.invoke).toHaveBeenCalledWith('admin-api', {
      body: { action: 'updateRecruitmentStatus', status: 'paused' },
      headers: { Authorization: 'Bearer admin-access-token' },
    });
  });

  test('관리자 API가 실패하거나 이상한 값을 주면 성공으로 치지 않는다', async () => {
    const invoke = jest.fn()
      .mockResolvedValueOnce({ data: null, error: new Error('unauthorized') })
      .mockResolvedValueOnce({ data: { status: 'unknown' }, error: null });
    const client = {
      auth: {
        getSession: jest.fn(async () => ({
          data: { session: { access_token: 'admin-access-token' } },
          error: null,
        })),
      },
      rpc: jest.fn(),
      functions: { invoke },
    };
    const { adminRecruitmentApi } = createSupabaseRecruitmentApis(client);

    await expect(adminRecruitmentApi.getRecruitmentStatus()).rejects.toThrow();
    await expect(adminRecruitmentApi.getRecruitmentStatus()).rejects.toThrow();
  });
});
