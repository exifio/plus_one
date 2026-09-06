/**
 * Integration test가 Supabase에 남기는 식별 가능한 데이터 목록.
 * cleanup 스크립트와 globalTeardown이 같은 기준을 사용한다.
 */
export const TEST_CONTACT_VALUES = [
  '01012345678',
  '01000000001',
  '01000000002',
  '01000000003',
  '01000000004',
  '01000000005',
  '01088880001',
  '01088880002',
  '01099998881',
  '01033334444',
  '01055556666',
  '01077778888',
  '01011112222',
  '01011112223',
  '01077770001',
  '01077770002',
  '01077770003',
  '01099990000',
  '01099990001',
  '01022223333',
];

export const TEST_CONTACT = {
  CREATE_SALE_PRIMARY: '01012345678',
  CREATE_SALE_INVALID_STORE: '01000000001',
  CREATE_SALE_EMPTY_ITEMS: '01000000002',
  CREATE_SALE_NO_EVIDENCE: '01000000003',
  CREATE_SALE_NO_EXPIRATION: '01000000004',
  CREATE_SALE_ROLLBACK: '01000000005',
  METRICS_REPEAT: '01088880001',
  METRICS_SINGLE: '01088880002',
  SCHEMA_CONSTRAINT: '01099998881',
  PROCESS_STORED_ITEM_PRIMARY: '01033334444',
  PROCESS_STORED_ITEM_REJECT: '01055556666',
  PROCESS_STORED_ITEM_REJECT_SUCCESS: '01077778888',
  START_CONTACT: '01011112222',
  START_CONTACT_DUPLICATE: '01011112223',
  RECRUITMENT_OPEN: '01077770001',
  RECRUITMENT_PAUSED: '01077770002',
  RECRUITMENT_MISSING_ROW: '01077770003',
  RLS_BLOCKED_SELLER: '01099990000',
  RLS_BLOCKED_UPDATE: '01099990001',
  PHASE3_GATE: '01022223333',
};

export const TEST_EVIDENCE_PREFIXES = [
  'anonymous/test-user',
  'anonymous/test',
  'anonymous/metrics',
  'anonymous/schema',
  'anonymous/rls',
  'anonymous/be5-integration',
];

export const TEST_STORAGE_FILES = {
  'sale-evidence': ['anonymous/be5-integration.png', 'anonymous/phase3-gate.png'],
  'purchase-evidence': ['admin/be5-integration.png'],
};

export const TEST_STORAGE_FOLDERS = {
  'sale-evidence': [
    'anonymous/test-user',
    'anonymous/test',
    'anonymous/metrics',
    'anonymous/schema',
    'anonymous/rls',
  ],
  'purchase-evidence': ['admin/test', 'admin/metrics', 'admin/schema'],
};
