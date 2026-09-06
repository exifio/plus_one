/*
 * 관련 작업: FE-8 및 LINK-3 — 보관상품 거절 처리 서비스.
 * 작성 이유: 거절 사유 없이 상품을 확정하거나 구매 증빙을 잘못 전달하면 처리 결과가 불완전해지기 때문.
 * 확인 내용: 사유 필수, 올바른 인자 전달, API 실패 시 성공 처리 금지.
 */
import { createRejectStoredItemService } from './rejectStoredItem';

function makeService(overrides = {}) {
  const adminApi = {
    rejectStoredItem:
      overrides.rejectStoredItem
      ?? jest.fn(async () => 'contacting'),
  };

  const service = createRejectStoredItemService({ adminApi });
  return { service, adminApi };
}

describe('거절은 이유가 있을 때만 확정하는지', () => {
  test('거절 이유가 있으면 거절 처리를 한 번만 요청한다', async () => {
    const { service, adminApi } = makeService();

    const result = await service('item-1', '가격 협의 불가');

    expect(result).toEqual({ ok: true, data: { status: 'contacting' } });
    expect(adminApi.rejectStoredItem).toHaveBeenCalledTimes(1);
  });

  test('거절할 때는 구매 증빙을 같이 보내지 않는다', async () => {
    const { service, adminApi } = makeService();

    await service('item-1', '연락 두절');

    const args = adminApi.rejectStoredItem.mock.calls[0];
    expect(args).toHaveLength(2);
    expect(args[0]).toBe('item-1');
    expect(args[1]).toBe('연락 두절');
  });

  test('거절 이유가 없으면 거절로 바꾸지 않는다', async () => {
    const { service, adminApi } = makeService();

    expect((await service('item-1', '')).ok).toBe(false);
    expect((await service('item-1', '   ')).ok).toBe(false);
    expect((await service('item-1', null)).ok).toBe(false);
    expect(adminApi.rejectStoredItem).not.toHaveBeenCalled();
  });

  test('관리자 저장에 실패하면 성공한 것처럼 돌려주지 않는다', async () => {
    const { service } = makeService({
      rejectStoredItem: jest.fn(async () => { throw new Error('api failed'); }),
    });

    const result = await service('item-1', '연락 두절');

    expect(result.ok).toBe(false);
    expect(result.error).toBe('submit');
  });
});
