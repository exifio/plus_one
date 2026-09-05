/*
 * 관련 작업: FE-7 및 LINK-2 — 판매 신청 제출 서비스.
 * 작성 이유: 검증·이미지 업로드·신청 RPC의 순서를 지키지 않으면 잘못된 신청이나 고아 데이터가 생길 수 있기 때문.
 * 확인 내용: 검증 실패, 업로드 실패, RPC 실패, 모집 중단 오류, 정상 제출의 호출 순서와 결과.
 */
import { createSubmitSaleRequestService } from './submitSaleRequest';

const today = '2026-09-04';

const validDraft = {
  convenienceStore: 'gs25',
  promotionType: 'one_plus_one',
  registrationMethod: 'screenshot',
  items: [
    {
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

const manualDraft = {
  ...validDraft,
  registrationMethod: 'manual',
  evidenceImage: null,
};

function makeService(overrides = {}) {
  const storageApi = {
    uploadEvidence: overrides.uploadEvidence
      ?? jest.fn(async (image) => (typeof image === 'string' ? image : image.name)),
  };
  const saleRequestApi = {
    submitSaleRequest: overrides.submitSaleRequest
      ?? jest.fn(async (payload) => ({ saleRequestId: 'sr-1', sellerId: 'seller-1', itemsCount: 1 })),
  };

  const service = createSubmitSaleRequestService({
    storageApi,
    saleRequestApi,
    today,
  });

  return { service, storageApi, saleRequestApi };
}

describe('판매 신청 제출 서비스', () => {
  test('정상 제출: 업로드 → RPC가 정확히 한 번 호출되고 성공 결과를 반환한다', async () => {
    const { service, storageApi, saleRequestApi } = makeService();

    const result = await service(validDraft);

    expect(result).toEqual({
      ok: true,
      data: { saleRequestId: 'sr-1', sellerId: 'seller-1', itemsCount: 1 },
    });
    expect(storageApi.uploadEvidence).toHaveBeenCalledTimes(1);
    expect(saleRequestApi.submitSaleRequest).toHaveBeenCalledTimes(1);
  });

  test('업로드 결과 경로가 RPC에 전달된다', async () => {
    const { service, saleRequestApi } = makeService({
      uploadEvidence: jest.fn(async () => 'evidence/sale/evidence.png'),
    });

    await service(validDraft);

    const payload = saleRequestApi.submitSaleRequest.mock.calls[0][0];
    expect(payload.evidenceImage).toBe('evidence/sale/evidence.png');
  });

  test('검증 실패 시 업로드와 RPC를 호출하지 않는다', async () => {
    const { service, storageApi, saleRequestApi } = makeService();

    const result = await service({
      ...manualDraft,
      items: [],
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe('validation');
    expect(storageApi.uploadEvidence).not.toHaveBeenCalled();
    expect(saleRequestApi.submitSaleRequest).not.toHaveBeenCalled();
  });

  test('업로드 실패 시 RPC를 호출하지 않고 실패를 반환한다', async () => {
    const { service, saleRequestApi } = makeService({
      uploadEvidence: jest.fn(async () => { throw new Error('upload failed'); }),
    });

    const result = await service(validDraft);

    expect(result.ok).toBe(false);
    expect(result.error).toBe('upload');
    expect(saleRequestApi.submitSaleRequest).not.toHaveBeenCalled();
  });

  test('RPC 실패 시 성공 결과를 반환하지 않는다', async () => {
    const { service } = makeService({
      submitSaleRequest: jest.fn(async () => { throw new Error('rpc failed'); }),
    });

    const result = await service(validDraft);

    expect(result.ok).toBe(false);
    expect(result.error).toBe('submit');
  });

  test('직접 입력은 스크린샷 업로드 없이 RPC를 호출한다', async () => {
    const { service, storageApi, saleRequestApi } = makeService();

    const result = await service(manualDraft);

    expect(result.ok).toBe(true);
    expect(storageApi.uploadEvidence).not.toHaveBeenCalled();
    expect(saleRequestApi.submitSaleRequest).toHaveBeenCalledWith(
      expect.objectContaining({ evidenceImage: null, registrationMethod: 'manual' }),
    );
  });

  test('RECRUITMENT_NOT_OPEN 오류는 모집 실패로 구분해 반환한다', async () => {
    const { service } = makeService({
      submitSaleRequest: jest.fn(async () => {
        const error = new Error('RECRUITMENT_NOT_OPEN');
        error.code = 'RECRUITMENT_NOT_OPEN';
        throw error;
      }),
    });

    const result = await service(validDraft);

    expect(result.ok).toBe(false);
    expect(result.error).toBe('recruitment');
  });
});
