/*
 * 관련 작업: FE-5 — 프론트엔드 단계의 판매 신청 fixture 어댑터.
 * 작성 이유: 실제 DB 없이도 API 계약, Seller 재사용, 신청 생성, 모집 차단을 검증해야 하기 때문.
 * 확인 내용: 정상·다중 상품·재신청·연락처 정규화·등록 방식·모집 상태 흐름.
 */
import { createFixtureAdapters } from './index';
import { assertSaleRequestApiContract } from '../../features/sale-request/api/saleRequestApiContract';

const validDraft = {
  convenienceStore: 'gs25',
  promotionType: 'one_plus_one',
  registrationMethod: 'manual',
  items: [
    {
      id: 'item-a',
      productName: '코카콜라 제로 500ml',
      expirationDate: '2026-09-30',
      originalPrice: 2200,
      askingPrice: 1000,
    },
  ],
  evidenceImage: null,
  contactType: 'phone',
  contactValue: '010-1234-5678',
};

describe('Fixture 판매 신청 API', () => {
  test('FE-4 판매자 API 계약을 준수한다', () => {
    const { saleRequestApi } = createFixtureAdapters();

    expect(() => assertSaleRequestApiContract(saleRequestApi)).not.toThrow();
  });

  test('판매 신청 제출은 성공 결과를 반환한다', async () => {
    const { saleRequestApi } = createFixtureAdapters();

    const result = await saleRequestApi.submitSaleRequest(validDraft);

    expect(result).toEqual({
      saleRequestId: 'sr-1',
      sellerId: 'seller-1',
      itemsCount: 1,
    });
  });

  test('여러 상품을 제출하면 상품 수와 판매/신청 id가 일치한다', async () => {
    const { saleRequestApi } = createFixtureAdapters();

    const result = await saleRequestApi.submitSaleRequest({
      ...validDraft,
      items: [
        validDraft.items[0],
        { ...validDraft.items[0], productName: '딸기우유 200ml' },
      ],
    });

    expect(result.itemsCount).toBe(2);
    expect(result.saleRequestId).toBe('sr-1');
    expect(result.sellerId).toBe('seller-1');
  });

  test('같은 연락처로 다시 제출하면 같은 판매자를 재사용하고 신청 번호는 새로 만든다', async () => {
    const { saleRequestApi } = createFixtureAdapters();

    const first = await saleRequestApi.submitSaleRequest(validDraft);
    const second = await saleRequestApi.submitSaleRequest({
      ...validDraft,
      promotionType: 'two_plus_one',
    });

    expect(first.sellerId).toBe('seller-1');
    expect(second.sellerId).toBe('seller-1');
    expect(first.saleRequestId).toBe('sr-1');
    expect(second.saleRequestId).toBe('sr-2');
  });

  test('다른 연락처는 다른 판매자로 생성된다', async () => {
    const { saleRequestApi } = createFixtureAdapters();

    const first = await saleRequestApi.submitSaleRequest(validDraft);
    const second = await saleRequestApi.submitSaleRequest({
      ...validDraft,
      contactValue: '010-9999-9999',
    });

    expect(first.sellerId).toBe('seller-1');
    expect(second.sellerId).toBe('seller-2');
  });

  test('전화번호는 저장 전에 정규화된다', async () => {
    const { saleRequestApi, adminApi } = createFixtureAdapters();

    const { saleRequestId } = await saleRequestApi.submitSaleRequest(validDraft);
    const detail = await adminApi.getSaleRequest(saleRequestId);

    expect(detail.seller.contact_value).toBe('01012345678');
  });

  test('증빙 이미지가 File이면 파일 이름으로 저장한다', async () => {
    const { saleRequestApi, adminApi } = createFixtureAdapters();

    const { saleRequestId } = await saleRequestApi.submitSaleRequest({
      ...validDraft,
      registrationMethod: 'screenshot',
      items: [],
      evidenceImage: new File(['image'], 'evidence.png', { type: 'image/png' }),
    });
    const detail = await adminApi.getSaleRequest(saleRequestId);

    expect(detail.registration_method).toBe('screenshot');
    expect(detail.evidence_image).toBe('evidence.png');
    expect(detail.items).toHaveLength(1);
    expect(detail.items[0].product_name).toBeNull();
  });

  test('직접 입력은 이미지 없이 저장한다', async () => {
    const { saleRequestApi, adminApi } = createFixtureAdapters();

    const { saleRequestId } = await saleRequestApi.submitSaleRequest(validDraft);
    const detail = await adminApi.getSaleRequest(saleRequestId);

    expect(detail.registration_method).toBe('manual');
    expect(detail.evidence_image).toBeNull();
    expect(detail.items).toHaveLength(1);
  });

  test('초기 모집 상태는 open이다', async () => {
    const { saleRequestApi } = createFixtureAdapters();

    expect(await saleRequestApi.getRecruitmentStatus()).toEqual({ status: 'open' });
  });

  test.each(['paused', 'closed'])(
    '모집 상태가 %s이면 create_sale_request 재현 로직도 판매 신청 생성을 거부한다',
    async (status) => {
      const { saleRequestApi, adminApi } = createFixtureAdapters();

      await adminApi.updateRecruitmentStatus(status);

      await expect(saleRequestApi.submitSaleRequest(validDraft)).rejects.toThrow(
        /RECRUITMENT_NOT_OPEN/,
      );

      // 거부된 신청은 판매자/신청/상품 어디에도 남지 않는다
      const list = await adminApi.getSaleRequests();
      expect(list).toHaveLength(0);
    },
  );

  test('모집 상태를 open으로 되돌리면 다시 신청할 수 있다', async () => {
    const { saleRequestApi, adminApi } = createFixtureAdapters();

    await adminApi.updateRecruitmentStatus('paused');
    await expect(saleRequestApi.submitSaleRequest(validDraft)).rejects.toThrow();

    await adminApi.updateRecruitmentStatus('open');

    await expect(saleRequestApi.submitSaleRequest(validDraft)).resolves.toMatchObject({
      saleRequestId: 'sr-1',
      sellerId: 'seller-1',
    });
  });
});
