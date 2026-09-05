/*
 * 관련 작업: FE-5·FE-8·FE-10 — 관리자 fixture 어댑터.
 * 작성 이유: 실제 DB 없이도 운영자가 신청을 조회·처리하고 실험 지표를 확인하는 흐름을 검증해야 하기 때문.
 * 확인 내용: API 계약, 목록·상세, 연락·구매·거절, completed 전환, 모집 상태, 지표 집계와 개인정보 제외.
 */
import { createFixtureAdapters } from './index';
import { assertAdminApiContract } from '../../features/admin/api/adminApiContract';

const twoItemDraft = {
  convenienceStore: 'cu',
  promotionType: 'two_plus_one',
  items: [
    {
      id: 'item-a',
      productName: '코카콜라 제로 500ml',
      expirationDate: '2026-09-30',
      originalPrice: 2200,
      askingPrice: 1000,
    },
    {
      id: 'item-b',
      productName: '딸기우유 200ml',
      expirationDate: '2026-09-28',
      originalPrice: 1500,
      askingPrice: 800,
    },
  ],
  evidenceImage: new File(['image'], 'evidence.png', { type: 'image/png' }),
  contactType: 'phone',
  contactValue: '010-1234-5678',
};

describe('Fixture 관리자 API', () => {
  test('FE-4 Admin API 계약을 준수한다', () => {
    const { adminApi } = createFixtureAdapters();

    expect(() => assertAdminApiContract(adminApi)).not.toThrow();
  });

  test('제출된 신청이 목록에 보인다', async () => {
    const { saleRequestApi, adminApi } = createFixtureAdapters();

    await saleRequestApi.submitSaleRequest(twoItemDraft);
    const list = await adminApi.getSaleRequests();

    expect(list).toHaveLength(1);
    expect(list[0]).toEqual(
      expect.objectContaining({
        convenience_store: 'cu',
        promotion_type: 'two_plus_one',
        status: 'received',
        items_count: 2,
        seller_contact: {
          contact_type: 'phone',
          contact_value: '01012345678',
        },
      }),
    );
  });

  test('상세에는 판매자와 보관상품이 포함된다', async () => {
    const { saleRequestApi, adminApi } = createFixtureAdapters();

    const { saleRequestId } = await saleRequestApi.submitSaleRequest(twoItemDraft);
    const detail = await adminApi.getSaleRequest(saleRequestId);

    expect(detail.seller.contact_type).toBe('phone');
    expect(detail.seller.contact_value).toBe('01012345678');
    expect(detail.items).toHaveLength(2);
    expect(detail.items[0]).toMatchObject({
      product_name: '코카콜라 제로 500ml',
      expiration_date: '2026-09-30',
      original_price: 2200,
      asking_price: 1000,
      result: 'pending',
      purchase_evidence: null,
      rejection_reason: null,
    });
  });

  test('연락 시작: received → contacting', async () => {
    const { saleRequestApi, adminApi } = createFixtureAdapters();

    const { saleRequestId } = await saleRequestApi.submitSaleRequest(twoItemDraft);
    const status = await adminApi.startContact(saleRequestId);

    expect(status).toBe('contacting');

    const list = await adminApi.getSaleRequests();
    expect(list[0].status).toBe('contacting');
  });

  test('이미 최종인 신청은 연락 시작할 수 없다', async () => {
    const { saleRequestApi, adminApi } = createFixtureAdapters();

    const { saleRequestId } = await saleRequestApi.submitSaleRequest(twoItemDraft);
    const detail = await adminApi.getSaleRequest(saleRequestId);
    await adminApi.purchaseStoredItem(detail.items[0].stored_item_id, 'deals/purchase/a.png');
    await adminApi.rejectStoredItem(detail.items[1].stored_item_id, '연락 두절');

    await expect(adminApi.startContact(saleRequestId)).rejects.toThrow();
  });

  test('구매 처리: 구매 증빙이 없으면 거부하고, 있으면 contacting을 유지한다', async () => {
    const { saleRequestApi, adminApi } = createFixtureAdapters();

    const { saleRequestId } = await saleRequestApi.submitSaleRequest(twoItemDraft);
    const detail = await adminApi.getSaleRequest(saleRequestId);
    const itemId = detail.items[0].stored_item_id;

    await expect(adminApi.purchaseStoredItem(itemId, '')).rejects.toThrow();
    await expect(adminApi.purchaseStoredItem(itemId, null)).rejects.toThrow();

    const status = await adminApi.purchaseStoredItem(itemId, 'deals/purchase/a.png');
    expect(status).toBe('contacting');

    const after = await adminApi.getSaleRequest(saleRequestId);
    expect(after.items[0]).toMatchObject({
      result: 'purchased',
      purchase_evidence: 'deals/purchase/a.png',
      rejection_reason: null,
    });
  });

  test('거절 처리: 거절 이유가 없으면 거부한다', async () => {
    const { saleRequestApi, adminApi } = createFixtureAdapters();

    const { saleRequestId } = await saleRequestApi.submitSaleRequest(twoItemDraft);
    const detail = await adminApi.getSaleRequest(saleRequestId);
    const itemId = detail.items[0].stored_item_id;

    await expect(adminApi.rejectStoredItem(itemId, '   ')).rejects.toThrow();

    const status = await adminApi.rejectStoredItem(itemId, '가격 불일치');
    expect(status).toBe('contacting');

    const after = await adminApi.getSaleRequest(saleRequestId);
    expect(after.items[0]).toMatchObject({
      result: 'rejected',
      rejection_reason: '가격 불일치',
      purchase_evidence: null,
    });
  });

  test('모든 상품이 최종 처리되면 신청은 completed가 된다', async () => {
    const { saleRequestApi, adminApi } = createFixtureAdapters();

    const { saleRequestId } = await saleRequestApi.submitSaleRequest(twoItemDraft);
    const detail = await adminApi.getSaleRequest(saleRequestId);

    await adminApi.purchaseStoredItem(detail.items[0].stored_item_id, 'deals/purchase/a.png');
    const status = await adminApi.rejectStoredItem(detail.items[1].stored_item_id, '연락 두절');

    expect(status).toBe('completed');

    const after = await adminApi.getSaleRequest(saleRequestId);
    expect(after.status).toBe('completed');
    expect(after.items.every((item) => item.result !== 'pending')).toBe(true);
  });

  test('최종 처리된 상품은 다시 변경할 수 없다', async () => {
    const { saleRequestApi, adminApi } = createFixtureAdapters();

    const { saleRequestId } = await saleRequestApi.submitSaleRequest(twoItemDraft);
    const detail = await adminApi.getSaleRequest(saleRequestId);
    const itemId = detail.items[0].stored_item_id;

    await adminApi.purchaseStoredItem(itemId, 'deals/purchase/a.png');

    await expect(adminApi.rejectStoredItem(itemId, '이유')).rejects.toThrow();
    await expect(adminApi.purchaseStoredItem(itemId, 'deals/purchase/b.png')).rejects.toThrow();
  });

  test('없는 신청 조회는 실패한다', async () => {
    const { adminApi } = createFixtureAdapters();

    await expect(adminApi.getSaleRequest('missing')).rejects.toThrow();
    await expect(adminApi.startContact('missing')).rejects.toThrow();
  });

  test('모집 상태를 변경하면 같은 저장소를 공유하는 조회에 반영된다', async () => {
    const { saleRequestApi, adminApi } = createFixtureAdapters();

    expect(await saleRequestApi.getRecruitmentStatus()).toEqual({ status: 'open' });

    expect(await adminApi.updateRecruitmentStatus('paused')).toBe('paused');
    expect(await saleRequestApi.getRecruitmentStatus()).toEqual({ status: 'paused' });

    expect(await adminApi.updateRecruitmentStatus('closed')).toBe('closed');
    expect(await saleRequestApi.getRecruitmentStatus()).toEqual({ status: 'closed' });

    expect(await adminApi.updateRecruitmentStatus('open')).toBe('open');
    expect(await saleRequestApi.getRecruitmentStatus()).toEqual({ status: 'open' });
  });

  test.each([undefined, null, '', 'active', 'REOPEN'])(
    '잘못된 모집 상태 %s는 fixture에서도 거부된다',
    async (status) => {
      const { adminApi } = createFixtureAdapters();

      await expect(adminApi.updateRecruitmentStatus(status)).rejects.toThrow();
    },
  );

  describe('실험 지표 조회', () => {
    const seedMetrics = async () => {
      const { saleRequestApi, adminApi } = createFixtureAdapters();

      // Seller 1이 같은 연락처로 2번 신청 (재신청 판매자)
      const first = await saleRequestApi.submitSaleRequest(twoItemDraft);
      await saleRequestApi.submitSaleRequest(twoItemDraft);

      // Seller 2 신청: 비율 구간 4종을 커버하는 item들
      const third = await saleRequestApi.submitSaleRequest({
        convenienceStore: 'gs25',
        promotionType: 'one_plus_one',
        items: [
          {
            id: 'item-c',
            productName: '컵라면',
            expirationDate: '2026-12-31',
            originalPrice: 2000,
            askingPrice: 500,
          },
          {
            id: 'item-d',
            productName: '삼각김밥',
            expirationDate: '2026-12-31',
            originalPrice: 1500,
            askingPrice: 1500,
          },
          {
            id: 'item-e',
            productName: '도시락',
            expirationDate: '2026-12-31',
            originalPrice: 2000,
            askingPrice: 3000,
          },
        ],
        evidenceImage: new File(['image'], 'metrics.png', { type: 'image/png' }),
        contactType: 'kakao',
        contactValue: ' 홍길동 ',
      });

      // 첫 신청: 연락 시작 → 구매 1 + 거절 1 → completed
      const detail = await adminApi.getSaleRequest(first.saleRequestId);
      await adminApi.startContact(first.saleRequestId);
      await adminApi.purchaseStoredItem(detail.items[0].stored_item_id, 'deals/purchase/a.png');
      await adminApi.rejectStoredItem(detail.items[1].stored_item_id, '연락 두절');

      // 세 번째 신청: 연락 시작 → contacting 유지
      await adminApi.startContact(third.saleRequestId);

      return { saleRequestApi, adminApi };
    };

    test('빈 저장소에서는 0과 빈 분포를 반환한다', async () => {
      const { adminApi } = createFixtureAdapters();

      const metrics = await adminApi.getExperimentMetrics();

      expect(metrics).toEqual({
        recruitmentStatus: 'open',
        totalSaleRequests: 0,
        uniqueSellers: 0,
        purchasedItems: 0,
        completedSaleRequests: 0,
        repeatSellers: 0,
        askingPriceDistribution: [],
        askingPriceRatioDistribution: {
          lte_25: 0,
          mid_26_50: 0,
          mid_51_75: 0,
          mid_76_100: 0,
          gt_100: 0,
        },
        convenienceStoreCounts: { gs25: 0, cu: 0 },
        promotionTypeCounts: { one_plus_one: 0, two_plus_one: 0 },
        saleRequestStatusCounts: { received: 0, contacting: 0, completed: 0 },
        itemResultCounts: { pending: 0, purchased: 0, rejected: 0 },
      });
    });

    test('운영 데이터에서 핵심 지표를 집계한다', async () => {
      const { adminApi } = await seedMetrics();

      const metrics = await adminApi.getExperimentMetrics();

      expect(metrics.recruitmentStatus).toBe('open');
      expect(metrics.totalSaleRequests).toBe(3);
      expect(metrics.uniqueSellers).toBe(2);
      expect(metrics.purchasedItems).toBe(1);
      expect(metrics.completedSaleRequests).toBe(1);
      expect(metrics.repeatSellers).toBe(1);
    });

    test('판매 희망금액 분포와 희망가격 비율 구간을 집계한다', async () => {
      const { adminApi } = await seedMetrics();

      const metrics = await adminApi.getExperimentMetrics();

      expect(metrics.askingPriceDistribution).toEqual([
        { price: 500, count: 1 },
        { price: 800, count: 2 },
        { price: 1000, count: 2 },
        { price: 1500, count: 1 },
        { price: 3000, count: 1 },
      ]);
      // 500/2000=25% → lte_25, 1000/2200≈45% → 26_50 (×2),
      // 800/1500≈53% → 51_75 (×2), 1500/1500=100% → 76_100, 3000/2000=150% → gt_100
      expect(metrics.askingPriceRatioDistribution).toEqual({
        lte_25: 1,
        mid_26_50: 2,
        mid_51_75: 2,
        mid_76_100: 1,
        gt_100: 1,
      });
    });

    test('편의점/행사/신청 상태/상품 결과별 집계를 반환한다', async () => {
      const { adminApi } = await seedMetrics();

      const metrics = await adminApi.getExperimentMetrics();

      expect(metrics.convenienceStoreCounts).toEqual({ gs25: 1, cu: 2 });
      expect(metrics.promotionTypeCounts).toEqual({ one_plus_one: 1, two_plus_one: 2 });
      expect(metrics.saleRequestStatusCounts).toEqual({
        received: 1,
        contacting: 1,
        completed: 1,
      });
      expect(metrics.itemResultCounts).toEqual({ pending: 5, purchased: 1, rejected: 1 });
    });

    test('모집 상태 변경이 실험 지표에 반영된다', async () => {
      const { adminApi } = await seedMetrics();

      await adminApi.updateRecruitmentStatus('paused');
      const metrics = await adminApi.getExperimentMetrics();

      expect(metrics.recruitmentStatus).toBe('paused');
    });

    test('개인정보와 증빙 경로는 응답에 포함되지 않는다', async () => {
      const { adminApi } = await seedMetrics();

      const metrics = await adminApi.getExperimentMetrics();
      const serialized = JSON.stringify(metrics);

      expect(serialized).not.toContain('01012345678');
      expect(serialized).not.toContain('홍길동');
      expect(serialized).not.toContain('deals/purchase/a.png');
      expect(serialized).not.toContain('contact_value');
      expect(serialized).not.toContain('purchase_evidence');
      expect(serialized).not.toContain('rejection_reason');
    });
  });
});
