import { createFixtureStore } from './fixtureStore';
import { createFixtureSaleRequestApi } from './fixtureSaleRequestApi';
import { createFixtureAdminApi } from './fixtureAdminApi';
import { createFixtureStorageApi } from './fixtureStorageApi';

/**
 * 실제 Supabase 없이 Seller/Admin UI 개발을 위한 Fixture 어댑터 묶음.
 *
 * 같은 메모리 저장소를 공유하므로 판매 신청 후 Admin 목록에 바로 보인다.
 * 새로고침이나 reload 후 데이터는 유지되지 않는다.
 */
export function createFixtureAdapters() {
  const store = createFixtureStore();

  return {
    saleRequestApi: createFixtureSaleRequestApi(store),
    adminApi: createFixtureAdminApi(store),
    storageApi: createFixtureStorageApi(),
  };
}