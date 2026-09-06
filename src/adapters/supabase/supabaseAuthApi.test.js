import { createSupabaseAuthApi } from './supabaseAuthApi';

describe('Supabase Auth API', () => {
  test('세션 조회·로그인·로그아웃을 안전한 반환값으로 감싼다', async () => {
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

  test('로그인 실패는 원본 Auth 오류를 노출하지 않고 코드화한다', async () => {
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

  test('getUser는 서버에서 현재 사용자를 확인하고 실패하면 코드화한다', async () => {
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

  test('Auth 상태 변경 구독 해제 함수를 반환한다', () => {
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
