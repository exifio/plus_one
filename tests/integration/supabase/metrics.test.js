/** @jest-environment node */

/*
 * 관련 작업: BE-6 — 실험 현황 집계 RPC.
 * 작성 이유: 운영 데이터를 지표로 바꾸되 연락처와 증빙 경로 같은 개인정보는 응답에 섞이면 안 되기 때문.
 * 확인 내용: 신청·Seller·구매·완료·재신청·가격 구간·상태별 집계와 anon 호출 차단.
 */
import { createAnonClient, createServiceClient } from './clients';

const SEEDED_REQUESTS = [
  {
    contact: '01088880001',
    convenienceStore: 'gs25',
    promotionType: 'one_plus_one',
    askingPrice: 200,
    result: 'purchased',
  },
  {
    contact: '01088880001',
    convenienceStore: 'cu',
    promotionType: 'two_plus_one',
    askingPrice: 500,
    result: 'pending',
  },
  {
    contact: '01088880002',
    convenienceStore: 'cu',
    promotionType: 'one_plus_one',
    askingPrice: 1200,
    result: 'pending',
  },
];

function summarize(requests, items) {
  const requestCounts = { received: 0, contacting: 0, completed: 0 };
  const storeCounts = { gs25: 0, cu: 0 };
  const promotionCounts = { one_plus_one: 0, two_plus_one: 0 };
  const resultCounts = { pending: 0, purchased: 0, rejected: 0 };
  const sellers = new Map();
  const prices = new Map();
  const ratios = { lte_25: 0, mid_26_50: 0, mid_51_75: 0, mid_76_100: 0, gt_100: 0 };

  for (const request of requests) {
    requestCounts[request.status] += 1;
    storeCounts[request.convenience_store] += 1;
    promotionCounts[request.promotion_type] += 1;
    sellers.set(request.seller_id, (sellers.get(request.seller_id) || 0) + 1);
  }

  for (const item of items) {
    resultCounts[item.result] += 1;
    if (item.asking_price === null || item.original_price === null) continue;

    prices.set(item.asking_price, (prices.get(item.asking_price) || 0) + 1);
    const ratio = (item.asking_price / item.original_price) * 100;
    if (ratio <= 25) ratios.lte_25 += 1;
    else if (ratio <= 50) ratios.mid_26_50 += 1;
    else if (ratio <= 75) ratios.mid_51_75 += 1;
    else if (ratio <= 100) ratios.mid_76_100 += 1;
    else ratios.gt_100 += 1;
  }

  return {
    totalSaleRequests: requests.length,
    uniqueSellers: sellers.size,
    repeatSellers: [...sellers.values()].filter((count) => count >= 2).length,
    purchasedItems: resultCounts.purchased,
    completedSaleRequests: requestCounts.completed,
    requestCounts,
    storeCounts,
    promotionCounts,
    resultCounts,
    prices,
    ratios,
  };
}

describe('실험 현황 집계 RPC', () => {
  let anonClient;
  let serviceClient;
  let baseline;
  const saleRequestIds = [];

  beforeAll(async () => {
    anonClient = createAnonClient();
    serviceClient = createServiceClient();

    const { error: statusError } = await serviceClient.rpc('update_recruitment_status', {
      p_status: 'open',
    });
    if (statusError) throw statusError;

    const [{ data: requests, error: requestError }, { data: items, error: itemError }] =
      await Promise.all([
        serviceClient.from('sale_requests').select('seller_id, convenience_store, promotion_type, status'),
        serviceClient.from('stored_items').select('asking_price, original_price, result'),
      ]);
    if (requestError) throw requestError;
    if (itemError) throw itemError;
    baseline = summarize(requests, items);

    for (const seed of SEEDED_REQUESTS) {
      const { data, error } = await serviceClient.rpc('create_sale_request', {
        p_contact_type: 'phone',
        p_contact_value: seed.contact,
        p_convenience_store: seed.convenienceStore,
        p_promotion_type: seed.promotionType,
        p_evidence_image: `anonymous/metrics/${seed.contact}.png`,
        p_items: [{
          product_name: `metrics-${seed.askingPrice}`,
          expiration_date: '2026-12-31',
          original_price: 1000,
          asking_price: seed.askingPrice,
        }],
      });
      if (error) throw error;
      saleRequestIds.push(data.sale_request_id);
    }

    const { data: itemsToPurchase, error: itemsError } = await serviceClient
      .from('stored_items')
      .select('stored_item_id')
      .eq('sale_request_id', saleRequestIds[0]);
    if (itemsError) throw itemsError;

    const { error: processError } = await serviceClient.rpc('process_stored_item', {
      p_stored_item_id: itemsToPurchase[0].stored_item_id,
      p_result: 'purchased',
      p_purchase_evidence: 'admin/metrics/purchase.jpg',
      p_rejection_reason: null,
    });
    if (processError) throw processError;
  });

  afterAll(async () => {
    if (saleRequestIds.length > 0) {
      await serviceClient
        .from('sale_requests')
        .delete()
        .in('sale_request_id', saleRequestIds);
    }
  });

  test('service role은 개인정보 없는 실험 현황 집계를 반환한다', async () => {
    const { data, error } = await serviceClient.rpc('get_experiment_metrics');

    expect(error).toBeNull();
    expect(data.totalSaleRequests).toBe(baseline.totalSaleRequests + 3);
    expect(data.uniqueSellers).toBe(baseline.uniqueSellers + 2);
    expect(data.repeatSellers).toBe(baseline.repeatSellers + 1);
    expect(data.purchasedItems).toBe(baseline.purchasedItems + 1);
    expect(data.completedSaleRequests).toBe(baseline.completedSaleRequests + 1);

    expect(data.convenienceStoreCounts.gs25).toBe(baseline.storeCounts.gs25 + 1);
    expect(data.convenienceStoreCounts.cu).toBe(baseline.storeCounts.cu + 2);
    expect(data.promotionTypeCounts.one_plus_one).toBe(
      baseline.promotionCounts.one_plus_one + 2,
    );
    expect(data.promotionTypeCounts.two_plus_one).toBe(
      baseline.promotionCounts.two_plus_one + 1,
    );
    expect(data.saleRequestStatusCounts.received).toBe(baseline.requestCounts.received + 2);
    expect(data.saleRequestStatusCounts.completed).toBe(baseline.requestCounts.completed + 1);
    expect(data.itemResultCounts.pending).toBe(baseline.resultCounts.pending + 2);
    expect(data.itemResultCounts.purchased).toBe(baseline.resultCounts.purchased + 1);

    for (const price of [200, 500, 1200]) {
      expect(data.askingPriceDistribution).toContainEqual({
        price,
        count: (baseline.prices.get(price) || 0) + 1,
      });
    }
    expect(data.askingPriceRatioDistribution.lte_25).toBe(baseline.ratios.lte_25 + 1);
    expect(data.askingPriceRatioDistribution.mid_26_50).toBe(baseline.ratios.mid_26_50 + 1);
    expect(data.askingPriceRatioDistribution.gt_100).toBe(baseline.ratios.gt_100 + 1);

    expect(JSON.stringify(data)).not.toMatch(
      /contact_value|evidence_image|purchase_evidence/,
    );
  });

  test('anon은 실험 현황 집계 RPC를 호출할 수 없다', async () => {
    const { error } = await anonClient.rpc('get_experiment_metrics');
    expect(error).not.toBeNull();
  });
});
