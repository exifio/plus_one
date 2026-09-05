/**
 * Fixture 전용 in-memory 저장소.
 *
 * 새로고침이나 reload 후 데이터를 유지하지 않는 개발용 저장소다.
 * 실제 운영 데이터처럼 가장하지 않는다.
 */
export function createFixtureStore() {
  const counters = {};

  return {
    sellers: [],
    saleRequests: [],
    storedItems: [],

    // 전역 모집 상태 (singleton). 초기 상태는 open이다. (명세 §6, §18)
    recruitment: { status: 'open', updated_at: null },

    /**
     * 예측 가능한 fixture id를 생성한다.
     * 예: nextId('seller') → 'seller-1', 'seller-2', ...
     */
    nextId(prefix) {
      counters[prefix] = (counters[prefix] || 0) + 1;
      return `${prefix}-${counters[prefix]}`;
    },
  };
}