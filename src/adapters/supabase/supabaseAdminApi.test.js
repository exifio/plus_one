import { createSupabaseRecruitmentApis } from './supabaseRecruitmentApi';

function createClient(invokeResults = []) {
  const invoke = jest.fn();
  for (const result of invokeResults) invoke.mockResolvedValueOnce(result);

  return {
    auth: {
      getSession: jest.fn(async () => ({
        data: { session: { access_token: 'admin-access-token' } },
        error: null,
      })),
    },
    rpc: jest.fn(),
    functions: { invoke },
  };
}

describe('실제 서버의 관리자 목록·처리 연결', () => {
  test('관리자 목록·상세는 로그인된 관리자 API 응답만 화면에 맞게 바꾼다', async () => {
    const client = createClient([
      {
        data: [{
          sale_request_id: 'request-1',
          seller_id: 'seller-1',
          convenience_store: 'gs25',
          promotion_type: 'one_plus_one',
          status: 'received',
          created_at: '2026-09-06T00:00:00.000Z',
          items_count: 1,
          seller_contact: { contact_type: 'phone', contact_value: '01012345678' },
        }],
        error: null,
      },
      {
        data: {
          sale_request_id: 'request-1',
          seller_id: 'seller-1',
          convenience_store: 'gs25',
          promotion_type: 'one_plus_one',
          registration_method: 'screenshot',
          status: 'received',
          created_at: '2026-09-06T00:00:00.000Z',
          seller: { seller_id: 'seller-1', contact_type: 'phone', contact_value: '01012345678' },
          items: [{
            stored_item_id: 'item-1',
            result: 'pending',
            asking_price: 700,
            purchase_evidence: null,
            purchase_evidence_url: null,
          }],
          sale_evidence_url: 'https://signed.example/sale',
        },
        error: null,
      },
    ]);
    const { adminRecruitmentApi } = createSupabaseRecruitmentApis(client);

    await expect(adminRecruitmentApi.getSaleRequests()).resolves.toEqual([
      expect.objectContaining({
        sale_request_id: 'request-1',
        seller_contact: { contact_type: 'phone', contact_value: '01012345678' },
      }),
    ]);
    await expect(adminRecruitmentApi.getSaleRequest('request-1')).resolves.toEqual(
      expect.objectContaining({
        sale_request_id: 'request-1',
        evidence_image: 'https://signed.example/sale',
        items: [{
          stored_item_id: 'item-1',
          result: 'pending',
          asking_price: 700,
          purchase_evidence: null,
        }],
      }),
    );
    expect(client.functions.invoke).toHaveBeenNthCalledWith(1, 'admin-api', {
      body: { action: 'listSaleRequests' },
      headers: { Authorization: 'Bearer admin-access-token' },
    });
    expect(client.functions.invoke).toHaveBeenNthCalledWith(2, 'admin-api', {
      body: { action: 'getSaleRequest', saleRequestId: 'request-1' },
      headers: { Authorization: 'Bearer admin-access-token' },
    });
  });

  test('연락·구매·거절 결과는 관리자 API가 준 상태만 사용한다', async () => {
    const client = createClient([
      { data: { status: 'contacting' }, error: null },
      { data: { status: 'completed' }, error: null },
      { data: { status: 'completed' }, error: null },
    ]);
    const { adminRecruitmentApi } = createSupabaseRecruitmentApis(client);

    await expect(adminRecruitmentApi.startContact('request-1')).resolves.toBe('contacting');
    await expect(adminRecruitmentApi.purchaseStoredItem('item-1', 'admin/purchase.png'))
      .resolves.toBe('completed');
    await expect(adminRecruitmentApi.rejectStoredItem('item-2', '이미 판매됨'))
      .resolves.toBe('completed');

    expect(client.functions.invoke).toHaveBeenNthCalledWith(1, 'admin-api', {
      body: { action: 'startContact', saleRequestId: 'request-1' },
      headers: { Authorization: 'Bearer admin-access-token' },
    });
    expect(client.functions.invoke).toHaveBeenNthCalledWith(2, 'admin-api', {
      body: {
        action: 'purchaseItem',
        storedItemId: 'item-1',
        purchaseEvidence: 'admin/purchase.png',
      },
      headers: { Authorization: 'Bearer admin-access-token' },
    });
    expect(client.functions.invoke).toHaveBeenNthCalledWith(3, 'admin-api', {
      body: {
        action: 'rejectItem',
        storedItemId: 'item-2',
        rejectionReason: '이미 판매됨',
      },
      headers: { Authorization: 'Bearer admin-access-token' },
    });
  });

  test('구매 증빙은 로그인한 관리자만 비공개 저장소에 올릴 수 있다', async () => {
    const client = createClient([{ data: { path: 'admin/purchase-id.png' }, error: null }]);
    const { adminStorageApi } = createSupabaseRecruitmentApis(client);
    const image = new File(['purchase'], 'purchase.png', { type: 'image/png' });

    await expect(adminStorageApi.uploadPurchaseEvidence(image))
      .resolves.toBe('admin/purchase-id.png');

    const body = client.functions.invoke.mock.calls[0][1].body;
    expect(client.functions.invoke).toHaveBeenCalledWith('admin-api', {
      body,
      headers: { Authorization: 'Bearer admin-access-token' },
    });
    expect(body).toBeInstanceOf(FormData);
    expect(body.get('action')).toBe('uploadPurchaseEvidence');
    expect(body.get('file')).toBe(image);
  });

  test('실험 현황 응답이 이상하면 숫자를 성공으로 보여주지 않는다', async () => {
    const metrics = {
      recruitmentStatus: 'open',
      totalSaleRequests: 0,
      uniqueSellers: 0,
      purchasedItems: 0,
      completedSaleRequests: 0,
      repeatSellers: 0,
      askingPriceDistribution: [],
      askingPriceRatioDistribution: { lte_25: 0, mid_26_50: 0, mid_51_75: 0, mid_76_100: 0, gt_100: 0 },
      convenienceStoreCounts: { gs25: 0, cu: 0 },
      promotionTypeCounts: { one_plus_one: 0, two_plus_one: 0 },
      saleRequestStatusCounts: { received: 0, contacting: 0, completed: 0 },
      itemResultCounts: { pending: 0, purchased: 0, rejected: 0 },
    };
    const client = createClient([{ data: metrics, error: null }]);
    const { adminRecruitmentApi } = createSupabaseRecruitmentApis(client);

    await expect(adminRecruitmentApi.getExperimentMetrics()).resolves.toEqual(metrics);
    expect(client.functions.invoke).toHaveBeenCalledWith('admin-api', {
      body: { action: 'getExperimentMetrics' },
      headers: { Authorization: 'Bearer admin-access-token' },
    });
  });

  test('로그인이 없으면 관리자 API를 부르지 않는다', async () => {
    const invoke = jest.fn();
    const client = {
      auth: {
        getSession: jest.fn(async () => ({ data: { session: null }, error: null })),
      },
      functions: { invoke },
    };
    const { adminRecruitmentApi } = createSupabaseRecruitmentApis(client);

    await expect(adminRecruitmentApi.getSaleRequests()).rejects.toMatchObject({
      code: 'ADMIN_RECRUITMENT_REQUEST_FAILED',
    });
    expect(invoke).not.toHaveBeenCalled();
  });
});
