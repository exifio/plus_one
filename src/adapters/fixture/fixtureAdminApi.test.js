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

describe('로컬 연습용 관리자 처리', () => {
  test('관리자 화면에 필요한 목록·처리·모집·실험 기능이 있다', () => {
    const { adminApi } = createFixtureAdapters();

    expect(() => assertAdminApiContract(adminApi)).not.toThrow();
  });

  test('제출한 신청이 관리자 목록에 나타난다', async () => {
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

  test('상세에서 판매자와 상품을 볼 수 있다', async () => {
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

  test('접수된 신청만 연락중으로 바꿀 수 있다', async () => {
    const { saleRequestApi, adminApi } = createFixtureAdapters();

    const { saleRequestId } = await saleRequestApi.submitSaleRequest(twoItemDraft);
    const status = await adminApi.startContact(saleRequestId);

    expect(status).toBe('contacting');

    const list = await adminApi.getSaleRequests();
    expect(list[0].status).toBe('contacting');
  });

  test('이미 끝난 신청은 다시 연락 시작으로 되돌리지 않는다', async () => {
    const { saleRequestApi, adminApi } = createFixtureAdapters();

    const { saleRequestId } = await saleRequestApi.submitSaleRequest(twoItemDraft);
    const detail = await adminApi.getSaleRequest(saleRequestId);
    await adminApi.purchaseStoredItem(detail.items[0].stored_item_id, 'deals/purchase/a.png');
    await adminApi.rejectStoredItem(detail.items[1].stored_item_id, '연락 두절');

    await expect(adminApi.startContact(saleRequestId)).rejects.toThrow();
  });

  test('구매 증빙이 있을 때만 구매로 바꾸고, 남은 상품이 있으면 연락중을 유지한다', async () => {
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

  test('거절 이유가 없으면 거절로 바꾸지 않는다', async () => {
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

  test('모든 상품을 처리하면 신청을 처리완료로 바꾼다', async () => {
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

  test('한 번 구매·거절한 상품은 다시 바꾸지 않는다', async () => {
    const { saleRequestApi, adminApi } = createFixtureAdapters();

    const { saleRequestId } = await saleRequestApi.submitSaleRequest(twoItemDraft);
    const detail = await adminApi.getSaleRequest(saleRequestId);
    const itemId = detail.items[0].stored_item_id;

    await adminApi.purchaseStoredItem(itemId, 'deals/purchase/a.png');

    await expect(adminApi.rejectStoredItem(itemId, '이유')).rejects.toThrow();
    await expect(adminApi.purchaseStoredItem(itemId, 'deals/purchase/b.png')).rejects.toThrow();
  });

  test('없는 신청을 찾으면 실패로 돌려준다', async () => {
    const { adminApi } = createFixtureAdapters();

    await expect(adminApi.getSaleRequest('missing')).rejects.toThrow();
    await expect(adminApi.startContact('missing')).rejects.toThrow();
  });

  test('운영자가 모집을 바꾸면 판매자 조회에도 바로 반영된다', async () => {
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

  describe('실험 현황 숫자를 어떻게 세는지', () => {
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

    test('데이터가 없으면 0과 빈 분포를 돌려준다', async () => {
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

    test('신청·판매자·구매·완료·재신청 숫자를 센다', async () => {
      const { adminApi } = await seedMetrics();

      const metrics = await adminApi.getExperimentMetrics();

      expect(metrics.recruitmentStatus).toBe('open');
      expect(metrics.totalSaleRequests).toBe(3);
      expect(metrics.uniqueSellers).toBe(2);
      expect(metrics.purchasedItems).toBe(1);
      expect(metrics.completedSaleRequests).toBe(1);
      expect(metrics.repeatSellers).toBe(1);
    });

    test('희망 가격과 원래 가격 대비 비율을 구간별로 센다', async () => {
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

    test('편의점·행사·신청 상태·상품 결과별로 센다', async () => {
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

    test('지금 모집 상태도 실험 현황에 같이 보여준다', async () => {
      const { adminApi } = await seedMetrics();

      await adminApi.updateRecruitmentStatus('paused');
      const metrics = await adminApi.getExperimentMetrics();

      expect(metrics.recruitmentStatus).toBe('paused');
    });

    test('실험 현황에 연락처나 사진 경로를 넣지 않는다', async () => {
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
