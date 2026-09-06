import { createClient } from '@supabase/supabase-js';
import { createFixtureAdapters } from './fixture';
import { createSupabaseAuthApi } from './supabase/supabaseAuthApi';
import { createSupabaseRecruitmentApis } from './supabase/supabaseRecruitmentApi';
import { createSupabaseSubmissionApis } from './supabase/supabaseSubmissionApi';

function envValue(env, ...names) {
  for (const name of names) {
    if (typeof env?.[name] === 'string' && env[name].trim()) return env[name].trim();
  }
  return '';
}

/**
 * VITE Supabase 설정이 있으면 Seller/Admin을 실제 API로 연결한다.
 * Supabase client가 Auth 세션을 보관하므로 Admin Edge Function 호출에도 같은
 * access token이 전달된다.
 */
export function createAppAdapters(env = {}, clientFactory = createClient) {
  const fixtureAdapters = createFixtureAdapters();
  const url = envValue(env, 'VITE_SUPABASE_URL');
  const key = envValue(env, 'VITE_SUPABASE_ANON_KEY', 'VITE_SUPABASE_PUBLISHABLE_KEY');

  if (!url || !key) return fixtureAdapters;

  const publicClient = clientFactory(url, key, { auth: { persistSession: false } });
  const adminClient = clientFactory(url, key);
  const publicApis = createSupabaseRecruitmentApis(publicClient);
  const adminApis = createSupabaseRecruitmentApis(adminClient);
  const submissionApis = createSupabaseSubmissionApis(publicClient);

  return {
    ...fixtureAdapters,
    saleRequestApi: {
      ...fixtureAdapters.saleRequestApi,
      getRecruitmentStatus: publicApis.saleRequestApi.getRecruitmentStatus,
      submitSaleRequest: submissionApis.submitSaleRequest,
    },
    adminApi: {
      ...fixtureAdapters.adminApi,
      ...adminApis.adminRecruitmentApi,
    },
    storageApi: {
      ...fixtureAdapters.storageApi,
      uploadEvidence: submissionApis.uploadEvidence,
      uploadPurchaseEvidence: adminApis.adminStorageApi.uploadPurchaseEvidence,
    },
    authApi: createSupabaseAuthApi(adminClient),
  };
}
