import { createSupabaseAuthApi } from './supabaseAuthApi';

describe('관리자 로그인 연결', () => {
  test('로그인·로그아웃 결과를 화면이 쓰기 쉬운 값으로 돌려준다', async () => {
    const session = { access_token: 'token' };
    const client = {
      auth: {
        getSession: jest.fn(async () => ({ data: { session }, error: null })),
        signInWithPassword: jest.fn(async () => ({ data: { session }, error: null })),
        signOut: jest.fn(async () => ({ error: null })),
      },
    };
    const api = createSupabaseAuthApi(client);

    await expect(api.getSession()).resolves.toBe(session);
    await expect(api.signIn('admin@example.com', 'password')).resolves.toBe(session);
    await expect(api.signOut()).resolves.toBeUndefined();
    expect(client.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'admin@example.com',
      password: 'password',
    });
  });

  test('로그인 실패 시 서버 오류 문구를 그대로 넘기지 않는다', async () => {
    const client = {
      auth: {
        getSession: jest.fn(),
        signInWithPassword: jest.fn(async () => ({
          data: { session: null },
          error: new Error('raw auth error'),
        })),
        signOut: jest.fn(),
      },
    };
    const api = createSupabaseAuthApi(client);

    await expect(api.signIn('admin@example.com', 'wrong'))
      .rejects.toMatchObject({ code: 'AUTH_SIGN_IN_FAILED' });
  });

  test('지금 로그인한 사람이 맞는지 서버에서 확인하고, 실패하면 안전한 오류로 바꾼다', async () => {
    const user = { id: 'admin-user' };
    const okClient = {
      auth: {
        getUser: jest.fn(async () => ({ data: { user }, error: null })),
      },
    };
    const failedClient = {
      auth: {
        getUser: jest.fn(async () => ({
          data: { user: null },
          error: new Error('invalid JWT'),
        })),
      },
    };

    await expect(createSupabaseAuthApi(okClient).getUser()).resolves.toBe(user);
    await expect(createSupabaseAuthApi(failedClient).getUser())
      .rejects.toMatchObject({ code: 'AUTH_USER_REQUEST_FAILED' });
  });

  test('로그인 상태 감시를 끊을 수 있게 한다', () => {
    const unsubscribe = jest.fn();
    const client = {
      auth: {
        onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe } }, error: null })),
      },
    };
    const api = createSupabaseAuthApi(client);
    const listener = jest.fn();

    const stop = api.onAuthStateChange(listener);
    stop();

    expect(client.auth.onAuthStateChange).toHaveBeenCalledWith(expect.any(Function));
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
