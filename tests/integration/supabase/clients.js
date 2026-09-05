/**
 * BE-1 통합 테스트용 Supabase 연결 도우미.
 *
 * .env.test.local에는 전용 non-production Supabase 프로젝트를 설정한다.
 * 이 도우미는 local 또는 production URL로 자동 fallback하지 않는다.
 */
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.resolve(process.cwd(), '.env.test.local');
const env = fs.existsSync(envPath)
  ? Object.fromEntries(
      fs.readFileSync(envPath, 'utf8')
        .split('\n')
        .map((line) => {
          const separator = line.indexOf('=');
          if (separator === -1) return null;
          const key = line.slice(0, separator).trim();
          let value = line.slice(separator + 1).trim();
          // 일반적인 .env 관행인 따옴표로 감싼 값을 허용한다.
          if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
          ) {
            value = value.slice(1, -1);
          }
          return key && value ? [key, value] : null;
        })
        .filter(Boolean)
    )
  : {};

function readEnv(...names) {
  for (const name of names) {
    const value = process.env[name] || env[name];
    if (value) return value;
  }
  return '';
}

function requiredEnv(label, value) {
  if (!value) {
    throw new Error(`Integration test environment is missing ${label}.`);
  }
  return value;
}

function getConfig() {
  const url = requiredEnv('SUPABASE_TEST_URL', readEnv('SUPABASE_TEST_URL'));
  const publishableKey = requiredEnv(
    'SUPABASE_TEST_PUBLISHABLE_KEY (or SUPABASE_TEST_ANON_KEY)',
    readEnv('SUPABASE_TEST_PUBLISHABLE_KEY', 'SUPABASE_TEST_ANON_KEY'),
  );
  const secretKey = requiredEnv(
    'SUPABASE_TEST_SECRET_KEY (or SUPABASE_TEST_SERVICE_ROLE_KEY)',
    readEnv('SUPABASE_TEST_SECRET_KEY', 'SUPABASE_TEST_SERVICE_ROLE_KEY'),
  );

  if (!url.startsWith('https://')) {
    throw new Error('SUPABASE_TEST_URL must point to a remote HTTPS project.');
  }

  if (readEnv('SUPABASE_TEST_PROJECT') !== 'non-production') {
    throw new Error(
      'Set SUPABASE_TEST_PROJECT=non-production before running integration tests.',
    );
  }

  return { url, publishableKey, secretKey };
}

export const createAnonClient = () =>
  createClient(getConfig().url, getConfig().publishableKey, {
    auth: { persistSession: false },
    global: { fetch: globalThis.fetch },
  });

export const createServiceClient = () =>
  createClient(getConfig().url, getConfig().secretKey, {
    auth: { persistSession: false },
    global: { fetch: globalThis.fetch },
  });

export const createAuthClient = () =>
  createClient(getConfig().url, getConfig().publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: globalThis.fetch },
  });

export const getTestSupabaseUrl = () => getConfig().url;

export const getTestPublishableKey = () => getConfig().publishableKey;

export const getTestAdminCredentials = () => ({
  email: readEnv('SUPABASE_TEST_ADMIN_EMAIL'),
  password: readEnv('SUPABASE_TEST_ADMIN_PASSWORD'),
});
