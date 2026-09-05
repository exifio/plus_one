import { createClient } from '@supabase/supabase-js';
import { createFixtureAdapters } from './fixture';
import { createSupabaseRecruitmentApis } from './supabase/supabaseRecruitmentApi';

function envValue(env, ...names) {
  for (const name of names) {
    if (typeof env?.[name] === 'string' && env[name].trim()) return env[name].trim();
  }
  return '';
}

/**
 * VITE Supabase 설정이 있으면 모집 상태만 실제 API로 연결한다.
 * 아직 연결하지 않은 제출/Admin 기능은 다음 LINK Task까지 fixture를 유지한다.
 */
export function createAppAdapters(env = {}, clientFactory = createClient) {
  const fixtureAdapters = createFixtureAdapters();
  const url = envValue(env, 'VITE_SUPABASE_URL');
  const key = envValue(env, 'VITE_SUPABASE_ANON_KEY', 'VITE_SUPABASE_PUBLISHABLE_KEY');

  if (!url || !key) return fixtureAdapters;

  const supabaseApis = createSupabaseRecruitmentApis(clientFactory(url, key));

  return {
    ...fixtureAdapters,
    saleRequestApi: {
      ...fixtureAdapters.saleRequestApi,
      getRecruitmentStatus: supabaseApis.saleRequestApi.getRecruitmentStatus,
    },
    adminApi: {
      ...fixtureAdapters.adminApi,
      ...supabaseApis.adminRecruitmentApi,
    },
  };
}
