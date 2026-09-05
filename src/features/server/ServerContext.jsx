import { createContext, useContext } from 'react';

/**
 * 앱 전역 어댑터 주입 지점.
 *
 * App은 어떤 어댑터(fixture/supabase)인지 알지 못하고,
 * composition root에서 받은 adapters를 context로 전달한다.
 *
 * adapters: { saleRequestApi, adminApi, storageApi }
 */
export const ServerContext = createContext(null);

export function useServer() {
  const value = useContext(ServerContext);
  if (!value) {
    throw new Error('useServer must be used within ServerContext.Provider');
  }
  return value;
}