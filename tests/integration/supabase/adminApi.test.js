/** @jest-environment node */

/*
 * 관련 작업: BE-7 — Supabase Auth 기반 관리자 Edge Function.
 * 작성 이유: access token이 없는 사용자나 잘못된 사용자가 민감한 관리자 작업을 호출하면 안 되기 때문.
 * 확인 내용: CORS, 토큰 없음·위조 토큰 차단, 허용된 관리자 토큰의 주요 action.
 */
import {
  createAuthClient,
  getTestAdminCredentials,
  getTestPublishableKey,
  getTestSupabaseUrl,
} from './clients';

const { email: adminEmail, password: adminPassword } = getTestAdminCredentials();
const adminAuthTest = adminEmail && adminPassword ? test : test.skip;

describe('로그인한 관리자만 관리자 API를 쓸 수 있는지', () => {
  test('관리자 로그인을 실어 보낼 수 있게 브라우저 요청을 허용한다', async () => {
    const response = await fetch(
      `${getTestSupabaseUrl()}/functions/v1/admin-api`,
      {
        method: 'OPTIONS',
        headers: {
          apikey: getTestPublishableKey(),
          origin: 'http://localhost:5173',
          'access-control-request-headers': 'authorization, content-type, apikey',
          'access-control-request-method': 'POST',
        },
      },
    );

    expect(response.status).toBe(200);
    const allowedHeaders = response.headers.get('access-control-allow-headers') ?? '';
    expect(allowedHeaders.toLowerCase()).toContain('authorization');
    expect(allowedHeaders.toLowerCase()).not.toContain('x-admin-secret');
  });

  test('로그인 없이 관리자 API를 부르면 막는다', async () => {
    const response = await fetch(
      `${getTestSupabaseUrl()}/functions/v1/admin-api`,
      {
        method: 'POST',
        headers: {
          apikey: getTestPublishableKey(),
          'content-type': 'application/json',
        },
        body: JSON.stringify({ action: 'getRecruitmentStatus' }),
      },
    );

    expect(response.status).toBe(401);
  });

  test('가짜 로그인으로는 관리자 API를 쓰지 못하게 한다', async () => {
    const response = await fetch(
      `${getTestSupabaseUrl()}/functions/v1/admin-api`,
      {
        method: 'POST',
        headers: {
          apikey: getTestPublishableKey(),
          authorization: 'Bearer invalid-admin-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ action: 'getRecruitmentStatus' }),
      },
    );

    expect(response.status).toBe(401);
  });

  adminAuthTest('정해진 관리자 계정만 모집 상태 같은 관리 기능을 쓸 수 있다', async () => {
    const authClient = createAuthClient();
    const { data, error } = await authClient.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword,
    });

    expect(error).toBeNull();
    expect(data.session?.access_token).toBeTruthy();

    try {
      const response = await fetch(
        `${getTestSupabaseUrl()}/functions/v1/admin-api`,
        {
          method: 'POST',
          headers: {
            apikey: getTestPublishableKey(),
            authorization: `Bearer ${data.session.access_token}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ action: 'getRecruitmentStatus' }),
        },
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(['open', 'paused', 'closed']).toContain(body.status);
    } finally {
      await authClient.auth.signOut();
    }
  });
});
