/** @jest-environment node */

/*
 * 관련 작업: BE-3·BE-4 — 모집 상태 공개 조회와 신청 생성 차단.
 * 작성 이유: 판매자 화면은 상태를 읽을 수 있어야 하지만 DB를 직접 만지거나 모집 중단을 우회하면 안 되기 때문.
 * 확인 내용: 공개 조회 RPC, 관리자 전용 변경, open 허용, paused/closed·row 누락 fail-closed.
 */
import { createAnonClient, createServiceClient } from './clients';

const SAMPLE_REQUEST = {
  p_contact_type: 'phone',
  p_contact_value: '01077770001',
  p_convenience_store: 'gs25',
  p_promotion_type: 'one_plus_one',
  p_registration_method: 'manual',
  p_evidence_image: null,
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

describe('모집 설정', () => {
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

  test('anon 클라이언트는 공개 모집 상태 RPC를 호출할 수 있다', async () => {
    const { data, error } = await anonClient.rpc('get_recruitment_status');

    expect(error).toBeNull();
    expect(['open', 'paused', 'closed']).toContain(data);
  });

  test('anon 클라이언트는 모집 설정 테이블을 직접 조회할 수 없다', async () => {
    const { error } = await anonClient
      .from('recruitment_settings')
      .select('status');

    expect(error).not.toBeNull();
  });

  test('anon 클라이언트는 모집 상태를 직접 수정할 수 없다', async () => {
    const { error } = await anonClient
      .from('recruitment_settings')
      .update({ status: 'closed' })
      .eq('id', 1);

    expect(error).not.toBeNull();
  });

  test('anon 클라이언트는 update_recruitment_status RPC를 실행할 수 없다', async () => {
    const { error } = await anonClient.rpc('update_recruitment_status', {
      p_status: 'closed',
    });

    expect(error).not.toBeNull();
  });

  test('service role은 open → paused → open, open → closed → open 전환이 가능하다', async () => {
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

  test('service role은 잘못된 상태 값을 거부한다', async () => {
    for (const status of ['', 'active', 'REOPEN', null]) {
      const { error } = await serviceClient.rpc('update_recruitment_status', {
        p_status: status,
      });
      expect(error).not.toBeNull();
    }
  });

  test('모집 중(open)일 때 create_sale_request가 성공한다', async () => {
    await serviceClient.rpc('update_recruitment_status', { p_status: 'open' });

    const { data, error } = await anonClient.rpc('create_sale_request', SAMPLE_REQUEST);

    expect(error).toBeNull();
    expect(data).toHaveProperty('sale_request_id');
  });

  test.each(['paused', 'closed'])(
    '모집 상태가 %s일 때 create_sale_request는 실패하고 데이터를 남기지 않는다',
    async (status) => {
      await serviceClient.rpc('update_recruitment_status', { p_status: status });

      const sellersBefore = await countRows(serviceClient, 'sellers');
      const requestsBefore = await countRows(serviceClient, 'sale_requests');
      const itemsBefore = await countRows(serviceClient, 'stored_items');

      const { error } = await anonClient.rpc('create_sale_request', {
        ...SAMPLE_REQUEST,
        p_contact_value: '01077770002',
      });

      expect(error).not.toBeNull();
      expect(error.message).toContain('RECRUITMENT_NOT_OPEN');

      expect(await countRows(serviceClient, 'sellers')).toBe(sellersBefore);
      expect(await countRows(serviceClient, 'sale_requests')).toBe(requestsBefore);
      expect(await countRows(serviceClient, 'stored_items')).toBe(itemsBefore);

      await serviceClient.rpc('update_recruitment_status', { p_status: 'open' });
    },
  );

  test('모집 설정 row가 없으면 create_sale_request는 실패하고 데이터를 남기지 않는다', async () => {
    const contactValue = '01077770003';
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
