import { beforeEach, describe, expect, it, vi } from 'vitest';

const { supabaseMock } = vi.hoisted(() => ({
  supabaseMock: {
    from: vi.fn(),
    auth: {
      signInWithPassword: vi.fn(),
      getSession: vi.fn(),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}));

vi.mock('./supabaseClient', () => ({ supabase: supabaseMock }));

import { getAdminSession, isAdminUser } from './authService';

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMock.auth.signOut.mockResolvedValue({ error: null });
  });

  it('관리자 목록에 없는 사용자를 허용하지 않는다', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    supabaseMock.from.mockReturnValue({ select });

    await expect(isAdminUser('not-allowlisted-user')).resolves.toBe(false);
    expect(supabaseMock.from).toHaveBeenCalledWith('admin_users');
    expect(eq).toHaveBeenCalledWith('user_id', 'not-allowlisted-user');
  });

  it('허용된 계정은 Supabase Auth 로그인 후 관리자 권한을 유지한다', async () => {
    supabaseMock.auth.signInWithPassword.mockResolvedValueOnce({
      data: { user: { id: 'allowlisted-user' } },
      error: null,
    });
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { user_id: 'allowlisted-user' },
      error: null,
    });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    supabaseMock.from.mockReturnValue({ select });

    const { signInAdmin } = await import('./authService');
    await expect(signInAdmin('admin@example.com', 'password')).resolves.toBeUndefined();

    expect(supabaseMock.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'admin@example.com',
      password: 'password',
    });
    expect(supabaseMock.auth.signOut).not.toHaveBeenCalled();
  });

  it('저장된 세션도 admin_users 허용목록을 통과해야 관리자 세션으로 반환한다', async () => {
    const session = { user: { id: 'allowlisted-user' } };
    supabaseMock.auth.getSession.mockResolvedValueOnce({ data: { session }, error: null });
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { user_id: 'allowlisted-user' },
      error: null,
    });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    supabaseMock.from.mockReturnValue({ select });

    await expect(getAdminSession()).resolves.toBe(session);
    expect(supabaseMock.auth.getSession).toHaveBeenCalledOnce();
  });

  it('허용되지 않은 계정으로 로그인하면 세션을 종료한다', async () => {
    supabaseMock.auth.signInWithPassword.mockResolvedValueOnce({
      data: { user: { id: 'not-allowlisted-user' } },
      error: null,
    });
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    supabaseMock.from.mockReturnValue({ select });

    const { signInAdmin } = await import('./authService');
    await expect(signInAdmin('admin@example.com', 'password')).rejects.toThrow(
      'ADMIN_NOT_AUTHORIZED',
    );
    expect(supabaseMock.auth.signOut).toHaveBeenCalled();
  });
});
