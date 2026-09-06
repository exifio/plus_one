/** @jest-environment node */

/*
 * 관련 작업: BE-3·BE-4 — 모집 상태 공개 조회와 신청 생성 차단.
 * 작성 이유: 판매자 화면은 상태를 읽을 수 있어야 하지만 DB를 직접 만지거나 모집 중단을 우회하면 안 되기 때문.
 * 확인 내용: 공개 조회 RPC, 관리자 전용 변경, open 허용, paused/closed·row 누락 fail-closed.
 */
import { createAnonClient, createServiceClient } from './clients';
import { TEST_CONTACT } from './testFixtures';

const SAMPLE_REQUEST = {
  p_contact_type: 'phone',
  p_contact_value: TEST_CONTACT.RECRUITMENT_OPEN,
  p_convenience_store: 'gs25',
  p_promotion_type: 'one_plus_one',
  p_evidence_image: 'anonymous/test/recruitment.png',
  p_registration_method: 'manual',
  p_items: [
    {
      product_name: '코카콜라 제로 500ml',
      expiration_date: '2026-12-31',
      original_price: 2200,
      asking_price: 1000,
    },
  ],
};

async function countRows(client, table) {
  const { count, error } = await client
    .from(table)
    .select('*', { count: 'exact', head: true });
  expect(error).toBeNull();
  return count;
}

describe('모집 상태는 공개로 읽히고, 신청 차단은 서버에서 막히는지', () => {
  let anonClient;
  let serviceClient;

  beforeAll(() => {
    anonClient = createAnonClient();
    serviceClient = createServiceClient();
  });

  afterAll(async () => {
    // 테스트가 모집 상태를 바꾸므로 항상 open으로 복원한다.
    await serviceClient.rpc('update_recruitment_status', { p_status: 'open' });
  });

  test('로그인하지 않아도 지금 모집 중인지는 물어볼 수 있다', async () => {
    const { data, error } = await anonClient.rpc('get_recruitment_status');

    expect(error).toBeNull();
    expect(['open', 'paused', 'closed']).toContain(data);
  });

  test('로그인하지 않은 사용자는 모집 설정 테이블을 직접 볼 수 없다', async () => {
    const { error } = await anonClient
      .from('recruitment_settings')
      .select('status');

    expect(error).not.toBeNull();
  });

  test('로그인하지 않은 사용자는 모집 상태를 직접 바꿀 수 없다', async () => {
    const { error } = await anonClient
      .from('recruitment_settings')
      .update({ status: 'closed' })
      .eq('id', 1);

    expect(error).not.toBeNull();
  });

  test('로그인하지 않은 사용자는 모집 상태 변경 기능을 실행할 수 없다', async () => {
    const { error } = await anonClient.rpc('update_recruitment_status', {
      p_status: 'closed',
    });

    expect(error).not.toBeNull();
  });

  test('운영자 권한으로는 모집을 열고 닫을 수 있다', async () => {
    for (const status of ['paused', 'open', 'closed', 'open']) {
      const { data, error } = await serviceClient.rpc('update_recruitment_status', {
        p_status: status,
      });
      expect(error).toBeNull();
      expect(data).toBe(status);

      const { data: currentStatus, error: readError } = await anonClient
        .rpc('get_recruitment_status');
      expect(readError).toBeNull();
      expect(currentStatus).toBe(status);
    }
  });

  test('운영자 권한이어도 이상한 모집 상태 값은 저장하지 않는다', async () => {
    for (const status of ['', 'active', 'REOPEN', null]) {
      const { error } = await serviceClient.rpc('update_recruitment_status', {
        p_status: status,
      });
      expect(error).not.toBeNull();
    }
  });

  test('모집 중일 때만 새 판매 신청을 저장한다', async () => {
    await serviceClient.rpc('update_recruitment_status', { p_status: 'open' });

    const { data, error } = await anonClient.rpc('create_sale_request', SAMPLE_REQUEST);

    expect(error).toBeNull();
    expect(data).toHaveProperty('sale_request_id');
  });

  test.each(['paused', 'closed'])(
    '모집이 일시중지이거나 마감이면 신청을 저장하지 않고 데이터도 남기지 않는다',
    async (status) => {
      await serviceClient.rpc('update_recruitment_status', { p_status: status });

      const sellersBefore = await countRows(serviceClient, 'sellers');
      const requestsBefore = await countRows(serviceClient, 'sale_requests');
      const itemsBefore = await countRows(serviceClient, 'stored_items');

      const { error } = await anonClient.rpc('create_sale_request', {
        ...SAMPLE_REQUEST,
        p_contact_value: TEST_CONTACT.RECRUITMENT_PAUSED,
      });

      expect(error).not.toBeNull();
      expect(error.message).toContain('RECRUITMENT_NOT_OPEN');

      expect(await countRows(serviceClient, 'sellers')).toBe(sellersBefore);
      expect(await countRows(serviceClient, 'sale_requests')).toBe(requestsBefore);
      expect(await countRows(serviceClient, 'stored_items')).toBe(itemsBefore);

      await serviceClient.rpc('update_recruitment_status', { p_status: 'open' });
    },
  );

  test('모집 설정이 없으면 신청을 허용하지 않고 데이터도 남기지 않는다', async () => {
    const contactValue = TEST_CONTACT.RECRUITMENT_MISSING_ROW;
    const { error: deleteError } = await serviceClient
      .from('recruitment_settings')
      .delete()
      .eq('id', 1);
    expect(deleteError).toBeNull();

    const { error } = await anonClient.rpc('create_sale_request', {
      ...SAMPLE_REQUEST,
      p_contact_value: contactValue,
    });

    expect(error).not.toBeNull();
    expect(error.message).toContain('RECRUITMENT_NOT_OPEN');

    const { data: sellers, error: sellerError } = await serviceClient
      .from('sellers')
      .select('seller_id')
      .eq('contact_type', 'phone')
      .eq('contact_value', contactValue);
    expect(sellerError).toBeNull();
    expect(sellers).toHaveLength(0);

    const { data: restoredStatus, error: restoreError } = await serviceClient.rpc(
      'update_recruitment_status',
      { p_status: 'open' },
    );
    expect(restoreError).toBeNull();
    expect(restoredStatus).toBe('open');
  });
});
