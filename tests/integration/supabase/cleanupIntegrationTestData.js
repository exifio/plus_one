import * as fs from 'fs';
import * as path from 'path';
import {
  TEST_CONTACT_VALUES,
  TEST_EVIDENCE_PREFIXES,
  TEST_STORAGE_FILES,
  TEST_STORAGE_FOLDERS,
} from './testFixtures.js';

function readEnvFileValue(name) {
  const envPath = path.resolve(process.cwd(), '.env.test.local');
  if (!fs.existsSync(envPath)) return '';

  const line = fs
    .readFileSync(envPath, 'utf8')
    .split('\n')
    .find((entry) => entry.startsWith(`${name}=`));
  if (!line) return '';

  let value = line.slice(name.length + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  return value;
}

export function assertIntegrationTestEnvironment() {
  const project = process.env.SUPABASE_TEST_PROJECT || readEnvFileValue('SUPABASE_TEST_PROJECT');
  if (project !== 'non-production') {
    throw new Error(
      'Refusing cleanup: set SUPABASE_TEST_PROJECT=non-production in .env.test.local.',
    );
  }
}

async function listObjectPaths(client, bucket, folder) {
  const { data, error } = await client.storage.from(bucket).list(folder, { limit: 1000 });
  if (error || !data?.length) return [];

  return data
    .filter((entry) => entry.name && !entry.name.endsWith('/'))
    .map((entry) => `${folder}/${entry.name}`);
}

async function removeStorageArtifacts(client) {
  const removed = [];

  for (const [bucket, files] of Object.entries(TEST_STORAGE_FILES)) {
    const { error } = await client.storage.from(bucket).remove(files);
    if (!error) removed.push(...files.map((path) => `${bucket}:${path}`));
  }

  for (const [bucket, folders] of Object.entries(TEST_STORAGE_FOLDERS)) {
    for (const folder of folders) {
      const paths = await listObjectPaths(client, bucket, folder);
      if (paths.length === 0) continue;

      const { error } = await client.storage.from(bucket).remove(paths);
      if (!error) removed.push(...paths.map((path) => `${bucket}:${path}`));
    }
  }

  return removed;
}

export async function cleanupIntegrationTestData(serviceClient) {
  assertIntegrationTestEnvironment();

  const summary = {
    deletedSaleRequests: 0,
    deletedSellers: 0,
    removedStorageObjects: [],
    recruitmentStatus: 'open',
  };

  const { data: sellers, error: sellerLookupError } = await serviceClient
    .from('sellers')
    .select('seller_id')
    .eq('contact_type', 'phone')
    .in('contact_value', TEST_CONTACT_VALUES);

  if (sellerLookupError) throw sellerLookupError;

  const sellerIds = (sellers ?? []).map((seller) => seller.seller_id);

  if (sellerIds.length > 0) {
    const { data: deletedBySeller, error: deleteRequestsError } = await serviceClient
      .from('sale_requests')
      .delete()
      .in('seller_id', sellerIds)
      .select('sale_request_id');

    if (deleteRequestsError) throw deleteRequestsError;
    summary.deletedSaleRequests += deletedBySeller?.length ?? 0;
  }

  for (const prefix of TEST_EVIDENCE_PREFIXES) {
    const { data: deletedByEvidence, error: deleteByEvidenceError } = await serviceClient
      .from('sale_requests')
      .delete()
      .like('evidence_image', `${prefix}%`)
      .select('sale_request_id');

    if (deleteByEvidenceError) throw deleteByEvidenceError;
    summary.deletedSaleRequests += deletedByEvidence?.length ?? 0;
  }

  const { data: deletedSellers, error: deleteSellersError } = await serviceClient
    .from('sellers')
    .delete()
    .eq('contact_type', 'phone')
    .in('contact_value', TEST_CONTACT_VALUES)
    .select('seller_id');

  if (deleteSellersError) throw deleteSellersError;
  summary.deletedSellers = deletedSellers?.length ?? 0;

  summary.removedStorageObjects = await removeStorageArtifacts(serviceClient);

  const { data: recruitmentStatus, error: recruitmentError } = await serviceClient.rpc(
    'update_recruitment_status',
    { p_status: 'open' },
  );
  if (recruitmentError) throw recruitmentError;
  summary.recruitmentStatus = recruitmentStatus;

  return summary;
}
