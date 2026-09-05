/*
 * 관련 작업: FE-4·FE-8·FE-9·FE-10 — 관리자 API 계약.
 * 작성 이유: 목록·상세·상태 처리·모집·실험 현황 화면이 같은 함수 이름과 인자 규칙을 사용해야 하기 때문.
 * 확인 내용: 필요한 8개 관리자 함수를 모두 제공하는지와 빠진 함수가 거부되는지.
 */
import {
  ADMIN_API_CONTRACT,
  assertAdminApiContract,
} from './adminApiContract';

describe('관리자 API 계약', () => {
  test('계약은 Admin 함수 8종이다', () => {
    expect(ADMIN_API_CONTRACT).toEqual([
      { name: 'getSaleRequests', arity: 0 },
      { name: 'getSaleRequest', arity: 1 },
      { name: 'getRecruitmentStatus', arity: 0 },
      { name: 'startContact', arity: 1 },
      { name: 'purchaseStoredItem', arity: 2 },
      { name: 'rejectStoredItem', arity: 2 },
      { name: 'updateRecruitmentStatus', arity: 1 },
      { name: 'getExperimentMetrics', arity: 0 },
    ]);
  });

  test('Admin 함수 8종을 모두 제공하면 계약을 통과한다', () => {
    const api = {
      getSaleRequests: async () => [],
      getSaleRequest: async (saleRequestId) => ({ saleRequestId }),
      getRecruitmentStatus: async () => ({ status: 'open' }),
      startContact: async (saleRequestId) => 'contacting',
      purchaseStoredItem: async (storedItemId, purchaseEvidence) => 'purchased',
      rejectStoredItem: async (storedItemId, rejectionReason) => 'rejected',
      updateRecruitmentStatus: async (status) => status,
      getExperimentMetrics: async () => ({}),
    };

    expect(() => assertAdminApiContract(api)).not.toThrow();
  });

  test('함수가 하나라도 없으면 계약을 위반한다', () => {
    expect(() => assertAdminApiContract({})).toThrow(/getSaleRequests/);
    expect(() =>
      assertAdminApiContract({ getSaleRequests: async () => [] }),
    ).toThrow(/getSaleRequest/);
    expect(() =>
      assertAdminApiContract({
        getSaleRequests: async () => [],
        getSaleRequest: async (saleRequestId) => ({ saleRequestId }),
        startContact: async (saleRequestId) => 'contacting',
        purchaseStoredItem: async (storedItemId, purchaseEvidence) => 'purchased',
        rejectStoredItem: async (storedItemId, rejectionReason) => 'rejected',
      }),
    ).toThrow(/getRecruitmentStatus/);
    expect(() =>
      assertAdminApiContract({
        getSaleRequests: async () => [],
        getSaleRequest: async (saleRequestId) => ({ saleRequestId }),
        getRecruitmentStatus: async () => ({ status: 'open' }),
        startContact: async (saleRequestId) => 'contacting',
        purchaseStoredItem: async (storedItemId, purchaseEvidence) => 'purchased',
        rejectStoredItem: async (storedItemId, rejectionReason) => 'rejected',
        updateRecruitmentStatus: async (status) => status,
      }),
    ).toThrow(/getExperimentMetrics/);
  });
});
