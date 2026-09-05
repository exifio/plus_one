/** @jest-environment node */

import {
  createAnonClient,
  createAuthClient,
  createServiceClient,
  getTestAdminCredentials,
} from './clients';
import { createSupabaseRecruitmentApis } from '../../../src/adapters/supabase/supabaseRecruitmentApi';

const { email, password } = getTestAdminCredentials();
const adminAuthTest = email && password ? test : test.skip;

describe('실제 Supabase 모집 상태 adapter', () => {
  const serviceClient = createServiceClient();

  afterAll(async () => {
    await serviceClient.rpc('update_recruitment_status', { p_status: 'open' });
  });

  test('판매자 adapter는 실제 공개 모집 상태 RPC를 읽는다', async () => {
    await serviceClient.rpc('update_recruitment_status', { p_status: 'paused' });

    const { saleRequestApi } = createSupabaseRecruitmentApis(createAnonClient());

    await expect(saleRequestApi.getRecruitmentStatus()).resolves.toEqual({ status: 'paused' });
  });

  adminAuthTest('관리자 adapter는 Auth Edge Function으로 조회·변경하고 판매자 조회에 반영한다', async () => {
    const authClient = createAuthClient();
    const { error } = await authClient.auth.signInWithPassword({ email, password });
    expect(error).toBeNull();

    try {
      const { adminRecruitmentApi } = createSupabaseRecruitmentApis(authClient);
      const { saleRequestApi } = createSupabaseRecruitmentApis(createAnonClient());

      await expect(adminRecruitmentApi.updateRecruitmentStatus('closed')).resolves.toBe('closed');
      await expect(adminRecruitmentApi.getRecruitmentStatus()).resolves.toEqual({ status: 'closed' });
      await expect(saleRequestApi.getRecruitmentStatus()).resolves.toEqual({ status: 'closed' });

      await expect(adminRecruitmentApi.updateRecruitmentStatus('open')).resolves.toBe('open');
      await expect(saleRequestApi.getRecruitmentStatus()).resolves.toEqual({ status: 'open' });
    } finally {
      await authClient.auth.signOut();
      await serviceClient.rpc('update_recruitment_status', { p_status: 'open' });
    }
  });
});
