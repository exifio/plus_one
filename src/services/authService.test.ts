import { describe, expect, it, vi } from 'vitest';

const { supabaseMock } = vi.hoisted(() => ({
  supabaseMock: {
    from: vi.fn(),
    auth: {
      signInWithPassword: vi.fn(),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}));

vi.mock('./supabaseClient', () => ({ supabase: supabaseMock }));

import { isAdminUser } from './authService';

describe('authService', () => {
  it('관리자 목록에 없는 사용자를 허용하지 않는다', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    supabaseMock.from.mockReturnValue({ select });

    await expect(isAdminUser('not-allowlisted-user')).resolves.toBe(false);
    expect(supabaseMock.from).toHaveBeenCalledWith('admin_users');
    expect(eq).toHaveBeenCalledWith('user_id', 'not-allowlisted-user');
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
