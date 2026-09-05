/**
 * API 계약 검증 헬퍼.
 *
 * 어댑터(fixture, supabase)가 API 계약에 정의된 함수를
 * 이름과 인자 개수(arity)까지 정확히 구현했는지 확인한다.
 *
 * @param {object} api 어댑터 구현
 * @param {Array<{name: string, arity: number}>} contract 계약 명세
 * @returns {object} 계약을 만족한 api
 */
export function assertApiContract(api, contract) {
  if (!Array.isArray(contract)) {
    throw new Error('API contract must be an array of { name, arity }.');
  }

  for (const method of contract) {
    const fn = api?.[method.name];
    if (typeof fn !== 'function') {
      throw new Error(`API contract violation: ${method.name} is missing.`);
    }
    if (typeof method.arity === 'number' && fn.length !== method.arity) {
      throw new Error(
        `API contract violation: ${method.name} expects ${fn.length} argument(s), contract requires ${method.arity}.`,
      );
    }
  }

  return api;
}