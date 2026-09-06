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

  const client = clientFactory(url, key);
  const supabaseApis = createSupabaseRecruitmentApis(client);
  const submissionApis = createSupabaseSubmissionApis(client);

  return {
    ...fixtureAdapters,
    saleRequestApi: {
      ...fixtureAdapters.saleRequestApi,
      getRecruitmentStatus: supabaseApis.saleRequestApi.getRecruitmentStatus,
      submitSaleRequest: submissionApis.submitSaleRequest,
    },
    adminApi: {
      ...fixtureAdapters.adminApi,
      ...supabaseApis.adminRecruitmentApi,
    },
    storageApi: {
      ...fixtureAdapters.storageApi,
      uploadEvidence: submissionApis.uploadEvidence,
      uploadPurchaseEvidence: supabaseApis.adminStorageApi.uploadPurchaseEvidence,
    },
    authApi: createSupabaseAuthApi(client),
  };
}
