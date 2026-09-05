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

describe('보관상품 구매 서비스', () => {
  test('정상 처리: 업로드 후 Admin API가 정확히 한 번 호출된다', async () => {
    const { service, storageApi, adminApi } = makeService();

    const result = await service('item-1', new File(['x'], 'deal.png', { type: 'image/png' }));

    expect(result).toEqual({ ok: true, data: { status: 'contacting' } });
    expect(storageApi.uploadPurchaseEvidence).toHaveBeenCalledTimes(1);
    expect(adminApi.purchaseStoredItem).toHaveBeenCalledTimes(1);
  });

  test('업로드 결과 경로가 Admin API에 전달된다', async () => {
    const { service, adminApi } = makeService({
      uploadPurchaseEvidence: jest.fn(async () => 'purchase-evidence/deal.png'),
    });

    await service('item-1', new File(['x'], 'deal.png', { type: 'image/png' }));

    expect(adminApi.purchaseStoredItem).toHaveBeenCalledWith('item-1', 'purchase-evidence/deal.png');
  });

  test('구매 증빙이 없으면 업로드와 Admin API를 호출하지 않는다', async () => {
    const { service, storageApi, adminApi } = makeService();

    const result = await service('item-1', null);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('validation');
    expect(storageApi.uploadPurchaseEvidence).not.toHaveBeenCalled();
    expect(adminApi.purchaseStoredItem).not.toHaveBeenCalled();
  });

  test('업로드 실패 시 Admin API를 호출하지 않는다', async () => {
    const { service, adminApi } = makeService({
      uploadPurchaseEvidence: jest.fn(async () => { throw new Error('upload failed'); }),
    });

    const result = await service('item-1', new File(['x'], 'deal.png', { type: 'image/png' }));

    expect(result.ok).toBe(false);
    expect(result.error).toBe('upload');
    expect(adminApi.purchaseStoredItem).not.toHaveBeenCalled();
  });

  test('Admin API 실패 시 성공 결과를 반환하지 않는다', async () => {
    const { service } = makeService({
      purchaseStoredItem: jest.fn(async () => { throw new Error('api failed'); }),
    });

    const result = await service('item-1', new File(['x'], 'deal.png', { type: 'image/png' }));

    expect(result.ok).toBe(false);
    expect(result.error).toBe('submit');
  });
});
