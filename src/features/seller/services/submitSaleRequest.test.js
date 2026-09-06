/*
 * 관련 작업: FE-7 및 LINK-2 — 판매 신청을 올리기 전에 검증·사진·저장 순서를 지키는지.
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

describe('판매 신청을 올리기 전에 검증·사진·저장 순서를 지키는지', () => {
  test('스크린샷 신청은 사진을 올린 뒤에만 저장하고 한 번만 저장한다', async () => {
    const { service, storageApi, saleRequestApi } = makeService();

    const result = await service(validDraft);

    expect(result).toEqual({
      ok: true,
      data: { saleRequestId: 'sr-1', sellerId: 'seller-1', itemsCount: 1 },
    });
    expect(storageApi.uploadEvidence).toHaveBeenCalledTimes(1);
    expect(saleRequestApi.submitSaleRequest).toHaveBeenCalledTimes(1);
  });

  test('올린 사진의 저장 경로가 신청 저장에 넘어가게 한다', async () => {
    const { service, saleRequestApi } = makeService({
      uploadEvidence: jest.fn(async () => 'evidence/sale/evidence.png'),
    });

    await service(validDraft);

    const payload = saleRequestApi.submitSaleRequest.mock.calls[0][0];
    expect(payload.evidenceImage).toBe('evidence/sale/evidence.png');
  });

  test('입력이 잘못되면 사진도 올리지 않고 신청도 저장하지 않는다', async () => {
    const { service, storageApi, saleRequestApi } = makeService();

    const result = await service({
      ...validDraft,
      items: [],
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe('validation');
    expect(storageApi.uploadEvidence).not.toHaveBeenCalled();
    expect(saleRequestApi.submitSaleRequest).not.toHaveBeenCalled();
  });

  test('사진 올리기에 실패하면 신청을 저장하지 않는다', async () => {
    const { service, saleRequestApi } = makeService({
      uploadEvidence: jest.fn(async () => { throw new Error('upload failed'); }),
    });

    const result = await service(validDraft);

    expect(result.ok).toBe(false);
    expect(result.error).toBe('upload');
    expect(saleRequestApi.submitSaleRequest).not.toHaveBeenCalled();
  });

  test('신청 저장에 실패하면 성공한 것처럼 돌려주지 않는다', async () => {
    const { service } = makeService({
      submitSaleRequest: jest.fn(async () => { throw new Error('rpc failed'); }),
    });

    const result = await service(validDraft);

    expect(result.ok).toBe(false);
    expect(result.error).toBe('submit');
  });

  test('스크린샷 방식인데 사진이 없으면 신청을 저장하지 않는다', async () => {
    const { service, storageApi, saleRequestApi } = makeService();

    const result = await service({ ...validDraft, evidenceImage: null });

    expect(result.ok).toBe(false);
    expect(result.error).toBe('validation');
    expect(storageApi.uploadEvidence).not.toHaveBeenCalled();
    expect(saleRequestApi.submitSaleRequest).not.toHaveBeenCalled();
  });

  test('직접 입력 신청은 사진을 올리지 않고 상품 정보만 저장한다', async () => {
    const { service, storageApi, saleRequestApi } = makeService();

    const result = await service({
      ...validDraft,
      registrationMethod: 'manual',
      evidenceImage: null,
    });

    expect(result.ok).toBe(true);
    expect(storageApi.uploadEvidence).not.toHaveBeenCalled();
    expect(saleRequestApi.submitSaleRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        registrationMethod: 'manual',
        evidenceImage: null,
      }),
    );
  });

  test('모집이 멈춰 있어서 실패한 것과 일반 저장 실패를 구분한다', async () => {
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
