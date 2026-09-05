/*
 * 관련 작업: FE-9 및 LINK-1 — 모집 상태 변경 서비스.
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

describe('모집 상태 변경 서비스', () => {
  test.each(['open', 'paused', 'closed'])('유효한 상태 %s는 API에 저장되고 성공을 반환한다', async (status) => {
    const { service, adminApi } = makeService();

    const result = await service(status);

    expect(result).toEqual({ ok: true, status });
    expect(adminApi.updateRecruitmentStatus).toHaveBeenCalledWith(status);
  });

  test.each([undefined, null, '', 'active', 'OPEN'])(
    '잘못된 상태 %s는 API를 호출하지 않고 검증 실패를 반환한다',
    async (status) => {
      const { service, adminApi } = makeService();

      const result = await service(status);

      expect(result).toEqual({ ok: false, error: 'validation' });
      expect(adminApi.updateRecruitmentStatus).not.toHaveBeenCalled();
    },
  );

  test('API 실패 시 성공처럼 처리하지 않고 실패를 반환한다', async () => {
    const { service } = makeService({
      updateRecruitmentStatus: jest.fn(async () => {
        throw new Error('api failed');
      }),
    });

    const result = await service('paused');

    expect(result).toEqual({ ok: false, error: 'api' });
  });
});
