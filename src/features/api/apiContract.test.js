/*
 * 관련 작업: FE-4 — 공통 API 계약 검사.
 * 작성 이유: 화면이 어떤 어댑터를 쓰는지 몰라도 필요한 함수와 인자 수는 항상 맞아야 하기 때문.
 * 확인 내용: 정상 계약, 추가 함수 허용, 누락·비함수·인자 수 오류.
 */
import { assertApiContract } from './apiContract';

describe('화면이 어떤 연결을 쓰든 필요한 기능 이름과 인자 수가 맞는지', () => {
  test('필요한 기능이 맞으면 그 연결을 그대로 쓴다', () => {
    const api = { submitSaleRequest: async (draft) => draft };
    const result = assertApiContract(api, [{ name: 'submitSaleRequest', arity: 1 }]);

    expect(result).toBe(api);
  });

  test('필요 없는 추가 기능이 있어도 연결을 막지 않는다', () => {
    const api = { submitSaleRequest: async (draft) => draft, extra: () => {} };

    expect(() =>
      assertApiContract(api, [{ name: 'submitSaleRequest', arity: 1 }]),
    ).not.toThrow();
  });

  test('필요한 기능이 없으면 연결을 막는다', () => {
    const api = {};

    expect(() =>
      assertApiContract(api, [{ name: 'getSaleRequests', arity: 0 }]),
    ).toThrow(/getSaleRequests/);
  });

  test('필요한 기능이 함수가 아니면 연결을 막는다', () => {
    const api = { submitSaleRequest: 'not-a-function' };

    expect(() =>
      assertApiContract(api, [{ name: 'submitSaleRequest', arity: 1 }]),
    ).toThrow(/submitSaleRequest/);
  });

  test('기능 인자 수가 다르면 연결을 막는다', () => {
    const api = { submitSaleRequest: async (a, b) => a + b };

    expect(() =>
      assertApiContract(api, [{ name: 'submitSaleRequest', arity: 1 }]),
    ).toThrow(/argument/);
  });

  test('기능 목록 형식이 잘못되면 연결을 막는다', () => {
    expect(() => assertApiContract({}, null)).toThrow();
  });
});
