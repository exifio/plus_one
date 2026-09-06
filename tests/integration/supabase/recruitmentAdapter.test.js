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

describe('실제 서버에서 판매자·운영자 모집 상태가 맞는지', () => {
  const serviceClient = createServiceClient();

  afterAll(async () => {
    await serviceClient.rpc('update_recruitment_status', { p_status: 'open' });
  });

  test('판매자 화면은 실제 공개 조회로 모집 상태를 읽는다', async () => {
    await serviceClient.rpc('update_recruitment_status', { p_status: 'paused' });

    const { saleRequestApi } = createSupabaseRecruitmentApis(createAnonClient());

    await expect(saleRequestApi.getRecruitmentStatus()).resolves.toEqual({ status: 'paused' });
  });

  adminAuthTest('운영자가 모집을 바꾸면 판매자 화면 조회에도 바로 반영된다', async () => {
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
