/*
 * 관련 작업: FE-8 및 LINK-3 — 보관상품 구매 처리 서비스.
 * 작성 이유: 구매 처리는 증빙 업로드가 성공한 뒤에만 관리자 API를 호출해야 하기 때문.
 * 확인 내용: 증빙 필수, 업로드 결과 전달, 각 실패 시 후속 API 호출 차단.
 */
import { createPurchaseStoredItemService } from './purchaseStoredItem';

function makeService(overrides = {}) {
  const storageApi = {
    uploadPurchaseEvidence:
      overrides.uploadPurchaseEvidence
      ?? jest.fn(async (image) => (typeof image === 'string' ? image : image.name)),
  };
  const adminApi = {
    purchaseStoredItem:
      overrides.purchaseStoredItem
      ?? jest.fn(async () => 'contacting'),
  };

  const service = createPurchaseStoredItemService({ storageApi, adminApi });
  return { service, storageApi, adminApi };
}

describe('구매 처리는 증빙 사진이 올라간 뒤에만 확정하는지', () => {
  test('구매 증빙을 올린 뒤에만 구매 처리를 한 번 요청한다', async () => {
    const { service, storageApi, adminApi } = makeService();

    const result = await service('item-1', new File(['x'], 'deal.png', { type: 'image/png' }));

    expect(result).toEqual({ ok: true, data: { status: 'contacting' } });
    expect(storageApi.uploadPurchaseEvidence).toHaveBeenCalledTimes(1);
    expect(adminApi.purchaseStoredItem).toHaveBeenCalledTimes(1);
  });

  test('올린 구매 증빙 경로가 구매 처리에 넘어가게 한다', async () => {
    const { service, adminApi } = makeService({
      uploadPurchaseEvidence: jest.fn(async () => 'purchase-evidence/deal.png'),
    });

    await service('item-1', new File(['x'], 'deal.png', { type: 'image/png' }));

    expect(adminApi.purchaseStoredItem).toHaveBeenCalledWith('item-1', 'purchase-evidence/deal.png');
  });

  test('구매 증빙이 없으면 구매 완료로 바꾸지 않는다', async () => {
    const { service, storageApi, adminApi } = makeService();

    const result = await service('item-1', null);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('validation');
    expect(storageApi.uploadPurchaseEvidence).not.toHaveBeenCalled();
    expect(adminApi.purchaseStoredItem).not.toHaveBeenCalled();
  });

  test('구매 증빙을 올리지 못하면 구매 완료로 바꾸지 않는다', async () => {
    const { service, adminApi } = makeService({
      uploadPurchaseEvidence: jest.fn(async () => { throw new Error('upload failed'); }),
    });

    const result = await service('item-1', new File(['x'], 'deal.png', { type: 'image/png' }));

    expect(result.ok).toBe(false);
    expect(result.error).toBe('upload');
    expect(adminApi.purchaseStoredItem).not.toHaveBeenCalled();
  });

  test('관리자 저장에 실패하면 성공한 것처럼 돌려주지 않는다', async () => {
    const { service } = makeService({
      purchaseStoredItem: jest.fn(async () => { throw new Error('api failed'); }),
    });

    const result = await service('item-1', new File(['x'], 'deal.png', { type: 'image/png' }));

    expect(result.ok).toBe(false);
    expect(result.error).toBe('submit');
  });
});
