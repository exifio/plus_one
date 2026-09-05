import { useCallback, useEffect, useState } from 'react';

/**
 * 모집 상태 조회 Hook.
 *
 * Home과 /sell이 진입 시 모집 상태를 확인하기 위해 공유한다.
 * 컴포넌트에 반복되는 조회 로직을 두지 않기 위한 최소 Hook이다.
 *
 * - 조회 실패 시 error=true — 판매 신청을 허용하는 fallback은 하지 않는다. (명세 §21)
 * - reload로 최신 상태를 다시 확인할 수 있다.
 *
 * @param {object} saleRequestApi 판매자 API 계약 (getRecruitmentStatus)
 * @returns {{ loading: boolean, status: string|null, error: boolean, reload: Function }}
 */
export function useRecruitmentStatus(saleRequestApi) {
  const [state, setState] = useState({ loading: true, status: null, error: false });

  const load = useCallback(() => {
    let cancelled = false;
    setState((previous) => ({ ...previous, loading: true, error: false }));

    saleRequestApi
      .getRecruitmentStatus()
      .then((data) => {
        if (!cancelled) setState({ loading: false, status: data.status, error: false });
      })
      .catch(() => {
        if (!cancelled) setState({ loading: false, status: null, error: true });
      });

    return () => {
      cancelled = true;
    };
  }, [saleRequestApi]);

  useEffect(() => load(), [load]);

  return { ...state, reload: load };
}
