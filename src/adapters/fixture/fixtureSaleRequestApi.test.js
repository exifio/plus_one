/*
 * 관련 작업: FE-5 — 프론트엔드 단계의 판매 신청 fixture 어댑터.
 * 작성 이유: 실제 DB 없이도 API 계약, Seller 재사용, 신청 생성, 모집 차단을 검증해야 하기 때문.
 * 확인 내용: 정상·다중 상품·재신청·연락처 정규화·증빙·모집 상태 흐름.
 */
import { createFixtureAdapters } from './index';
import { assertSaleRequestApiContract } from '../../features/sale-request/api/saleRequestApiContract';

const validDraft = {
  convenienceStore: 'gs25',
  promotionType: 'one_plus_one',
  items: [
    {
      id: 'item-a',
      productName: '코카콜라 제로 500ml',
      expirationDate: '2026-09-30',
      originalPrice: 2200,
      askingPrice: 1000,
    },
  ],
  evidenceImage: new File(['image'], 'evidence.png', { type: 'image/png' }),
  contactType: 'phone',
  contactValue: '010-1234-5678',
};

describe('로컬 연습용 판매 신청 저장', () => {
  test('판매 화면에 필요한 제출·모집 조회 기능이 있다', () => {
    const { saleRequestApi } = createFixtureAdapters();

    expect(() => assertSaleRequestApiContract(saleRequestApi)).not.toThrow();
  });

  test('연습 데이터에 신청을 넣으면 신청 번호를 돌려준다', async () => {
    const { saleRequestApi } = createFixtureAdapters();

    const result = await saleRequestApi.submitSaleRequest(validDraft);

    expect(result).toEqual({
      saleRequestId: 'sr-1',
      sellerId: 'seller-1',
      itemsCount: 1,
    });
  });

  test('상품이 여러 개면 그 개수만큼 저장한다', async () => {
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

  test('같은 연락처로 다시 신청하면 판매자는 같고 신청만 새로 만든다', async () => {
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

  test('다른 연락처면 다른 판매자로 만든다', async () => {
    const { saleRequestApi } = createFixtureAdapters();

    const first = await saleRequestApi.submitSaleRequest(validDraft);
    const second = await saleRequestApi.submitSaleRequest({
      ...validDraft,
      contactValue: '010-9999-9999',
    });

    expect(first.sellerId).toBe('seller-1');
    expect(second.sellerId).toBe('seller-2');
  });

  test('휴대폰 번호는 하이픈을 빼고 저장한다', async () => {
    const { saleRequestApi, adminApi } = createFixtureAdapters();

    const { saleRequestId } = await saleRequestApi.submitSaleRequest(validDraft);
    const detail = await adminApi.getSaleRequest(saleRequestId);

    expect(detail.seller.contact_value).toBe('01012345678');
  });

  test('올린 사진 이름을 신청에 남긴다', async () => {
    const { saleRequestApi, adminApi } = createFixtureAdapters();

    const { saleRequestId } = await saleRequestApi.submitSaleRequest({
      ...validDraft,
      evidenceImage: new File(['image'], 'evidence.png', { type: 'image/png' }),
    });
    const detail = await adminApi.getSaleRequest(saleRequestId);

    expect(detail.evidence_image).toBe('evidence.png');
    expect(detail.items).toHaveLength(1);
  });

  test('스크린샷 등록인데 사진이 없으면 저장하지 않는다', async () => {
    const { saleRequestApi } = createFixtureAdapters();

    await expect(saleRequestApi.submitSaleRequest({
      ...validDraft,
      registrationMethod: 'screenshot',
      evidenceImage: null,
    })).rejects.toThrow();
  });

  test('스크린샷 등록은 상품명 없이도 저장할 수 있다', async () => {
    const { saleRequestApi, adminApi } = createFixtureAdapters();

    const { saleRequestId } = await saleRequestApi.submitSaleRequest({
      ...validDraft,
      registrationMethod: 'screenshot',
      items: [{
        id: 'item-screenshot',
        productName: '',
        expirationDate: '',
        originalPrice: null,
        askingPrice: 1000,
      }],
    });
    const detail = await adminApi.getSaleRequest(saleRequestId);

    expect(detail.registration_method).toBe('screenshot');
    expect(detail.items[0]).toMatchObject({
      product_name: null,
      original_price: null,
      asking_price: 1000,
    });
  });

  test('직접 입력은 사진 없이도 저장할 수 있다', async () => {
    const { saleRequestApi, adminApi } = createFixtureAdapters();

    const { saleRequestId } = await saleRequestApi.submitSaleRequest({
      ...validDraft,
      registrationMethod: 'manual',
      evidenceImage: null,
    });
    const detail = await adminApi.getSaleRequest(saleRequestId);

    expect(detail.registration_method).toBe('manual');
    expect(detail.evidence_image).toBeNull();
  });

  test('처음에는 모집을 받고 있는 상태다', async () => {
    const { saleRequestApi } = createFixtureAdapters();

    expect(await saleRequestApi.getRecruitmentStatus()).toEqual({ status: 'open' });
  });

  test.each(['paused', 'closed'])(
    '모집이 일시중지이거나 마감이면 연습 데이터에도 신청을 남기지 않는다',
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

  test('모집을 다시 열면 신청을 다시 받을 수 있다', async () => {
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
