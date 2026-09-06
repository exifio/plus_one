/*
 * 관련 작업: FE-9 및 LINK-1 — 운영자가 모집 상태를 바꿀 때 잘못된 값을 보내지 않는지.
 * 작성 이유: DB에 없는 상태를 보내거나 저장 실패를 성공처럼 표시하면 신규 신청 차단이 틀어지기 때문.
 * 확인 내용: 세 가지 정상 상태, 잘못된 상태의 사전 차단, API 실패 결과.
 */
import { createUpdateRecruitmentStatusService } from './updateRecruitmentStatus';

function makeService(overrides = {}) {
  const adminApi = {
    updateRecruitmentStatus: overrides.updateRecruitmentStatus
      ?? jest.fn(async (status) => status),
  };
  const service = createUpdateRecruitmentStatusService({ adminApi });
  return { service, adminApi };
}

describe('운영자가 모집 상태를 바꿀 때 잘못된 값을 보내지 않는지', () => {
  test.each(['open', 'paused', 'closed'])('모집 중·일시중지·마감만 저장하고 성공으로 돌려준다', async (status) => {
    const { service, adminApi } = makeService();

    const result = await service(status);

    expect(result).toEqual({ ok: true, status });
    expect(adminApi.updateRecruitmentStatus).toHaveBeenCalledWith(status);
  });

  test.each([undefined, null, '', 'active', 'OPEN'])(
    '허용되지 않은 모집 상태는 서버에 보내기 전에 막는다',
    async (status) => {
      const { service, adminApi } = makeService();

      const result = await service(status);

      expect(result).toEqual({ ok: false, error: 'validation' });
      expect(adminApi.updateRecruitmentStatus).not.toHaveBeenCalled();
    },
  );

  test('모집 상태 저장에 실패하면 성공한 것처럼 돌려주지 않는다', async () => {
    const { service } = makeService({
      updateRecruitmentStatus: jest.fn(async () => {
        throw new Error('api failed');
      }),
    });

    const result = await service('paused');

    expect(result).toEqual({ ok: false, error: 'api' });
  });
});
