/*
 * 관련 작업: FE-4·FE-7 — 판매자 API 계약.
 * 작성 이유: 판매 화면은 fixture와 실제 Supabase 어댑터를 바꿔도 제출·모집 조회 함수를 같은 방식으로 호출해야 하기 때문.
 * 확인 내용: 계약 목록과 두 함수의 존재 여부.
 */
import {
  SALE_REQUEST_API_CONTRACT,
  assertSaleRequestApiContract,
} from './saleRequestApiContract';

describe('판매 화면이 제출·모집 조회 기능을 빠뜨리지 않는지', () => {
  test('판매 화면은 신청 제출과 모집 상태 조회가 필요하다', () => {
    expect(SALE_REQUEST_API_CONTRACT).toEqual([
      { name: 'submitSaleRequest', arity: 1 },
      { name: 'getRecruitmentStatus', arity: 0 },
    ]);
  });

  test('필요한 판매 기능이 있으면 연결을 통과한다', () => {
    const api = {
      submitSaleRequest: async (draft) => draft,
      getRecruitmentStatus: async () => ({ status: 'open' }),
    };

    expect(() => assertSaleRequestApiContract(api)).not.toThrow();
  });

  test('신청 제출 기능이 없으면 연결을 막는다', () => {
    const api = { getRecruitmentStatus: async () => ({ status: 'open' }) };

    expect(() => assertSaleRequestApiContract(api)).toThrow(/submitSaleRequest/);
  });

  test('모집 상태 조회 기능이 없으면 연결을 막는다', () => {
    const api = { submitSaleRequest: async (draft) => draft };

    expect(() => assertSaleRequestApiContract(api)).toThrow(/getRecruitmentStatus/);
  });
});
