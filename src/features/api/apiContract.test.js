/*
 * 관련 작업: FE-4 — 공통 API 계약 검사.
 * 작성 이유: 화면이 어떤 어댑터를 쓰는지 몰라도 필요한 함수와 인자 수는 항상 맞아야 하기 때문.
 * 확인 내용: 정상 계약, 추가 함수 허용, 누락·비함수·인자 수 오류.
 */
import { assertApiContract } from './apiContract';

describe('API 계약 검증', () => {
  test('모든 함수가 계약과 일치하면 객체를 그대로 반환한다', () => {
    const api = { submitSaleRequest: async (draft) => draft };
    const result = assertApiContract(api, [{ name: 'submitSaleRequest', arity: 1 }]);

    expect(result).toBe(api);
  });

  test('계약에 없는 추가 함수는 위반으로 보지 않는다', () => {
    const api = { submitSaleRequest: async (draft) => draft, extra: () => {} };

    expect(() =>
      assertApiContract(api, [{ name: 'submitSaleRequest', arity: 1 }]),
    ).not.toThrow();
  });

  test('함수가 없으면 예외를 던진다', () => {
    const api = {};

    expect(() =>
      assertApiContract(api, [{ name: 'getSaleRequests', arity: 0 }]),
    ).toThrow(/getSaleRequests/);
  });

  test('함수가 함수가 아니면 예외를 던진다', () => {
    const api = { submitSaleRequest: 'not-a-function' };

    expect(() =>
      assertApiContract(api, [{ name: 'submitSaleRequest', arity: 1 }]),
    ).toThrow(/submitSaleRequest/);
  });

  test('인자 개수가 다르면 예외를 던진다', () => {
    const api = { submitSaleRequest: async (a, b) => a + b };

    expect(() =>
      assertApiContract(api, [{ name: 'submitSaleRequest', arity: 1 }]),
    ).toThrow(/argument/);
  });

  test('계약 목록이 배열이 아니면 예외를 던진다', () => {
    expect(() => assertApiContract({}, null)).toThrow();
  });
});
