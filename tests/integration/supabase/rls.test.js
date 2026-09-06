/** @jest-environment node */

/*
 * 관련 작업: BE-3 — non-production Supabase RLS 권한 경계.
 * 작성 이유: 비로그인 판매자가 Seller·신청·상품의 민감 데이터를 직접 읽거나 바꾸면 안 되기 때문.
 * 확인 내용: anon 직접 조회·변경 차단과 관리자용 service role 조회 허용.
 */
import { createAnonClient, createServiceClient } from './clients';
import { TEST_CONTACT } from './testFixtures';

describe('로그인하지 않은 사용자가 민감 데이터를 직접 보지 못하는지', () => {
  let anonClient;
  let serviceClient;

  beforeAll(() => {
    anonClient = createAnonClient();
    serviceClient = createServiceClient();
  });

  test('로그인하지 않은 사용자는 판매자 연락처를 직접 볼 수 없다', async () => {
    const { error } = await anonClient.from('sellers').select('*');
    expect(error).not.toBeNull();
    expect(error.code).toBe('42501'); // 권한 거부
  });

  test('로그인하지 않은 사용자는 판매 신청 목록을 직접 볼 수 없다', async () => {
    const { error } = await anonClient.from('sale_requests').select('*');
    expect(error).not.toBeNull();
    expect(error.code).toBe('42501');
  });

  test('로그인하지 않은 사용자는 보관상품 전체를 직접 볼 수 없다', async () => {
    const { error } = await anonClient.from('stored_items').select('*');
    expect(error).not.toBeNull();
    expect(error.code).toBe('42501');
  });

  test('로그인하지 않은 사용자는 판매자를 직접 추가할 수 없다', async () => {
    const { error } = await anonClient.from('sellers').insert({
      contact_type: 'phone',
      contact_value: TEST_CONTACT.RLS_BLOCKED_SELLER,
    });
    expect(error).not.toBeNull();
  });

  test.each([
    [
      'sellers update',
      () => anonClient
        .from('sellers')
        .update({ contact_value: TEST_CONTACT.RLS_BLOCKED_UPDATE })
        .eq('seller_id', '00000000-0000-0000-0000-000000000001'),
    ],
    [
      'sale_requests insert',
      () => anonClient.from('sale_requests').insert({
        seller_id: '00000000-0000-0000-0000-000000000001',
        convenience_store: 'gs25',
        promotion_type: 'one_plus_one',
        evidence_image: 'anonymous/rls/blocked.png',
      }),
    ],
    [
      'stored_items delete',
      () => anonClient
        .from('stored_items')
        .delete()
        .eq('stored_item_id', '00000000-0000-0000-0000-000000000001'),
    ],
    [
      'recruitment_settings delete',
      () => anonClient
        .from('recruitment_settings')
        .delete()
        .eq('id', 1),
    ],
  ])('로그인하지 않은 사용자는 민감 데이터를 직접 바꾸거나 지울 수 없다 (%s)', async (_operation, request) => {
    const { error } = await request();
    expect(error).not.toBeNull();
  });

  test('서버 관리 권한으로는 판매자 데이터를 조회할 수 있다', async () => {
    const { error } = await serviceClient.from('sellers').select('*').limit(1);
    // 오류가 없으면 정책이 허용한 것이다(테이블이 비어 있어도 동일)
    expect(error).toBeNull();
  });
});
