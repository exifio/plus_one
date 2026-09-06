import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useServer } from '../../server/ServerContext';

export default function AdminAuthGate() {
  const { authApi } = useServer();
  const location = useLocation();
  const [state, setState] = useState({ loading: Boolean(authApi), session: null });

  useEffect(() => {
    if (!authApi) {
      setState({ loading: false, session: null });
      return undefined;
    }

    let cancelled = false;

    const resolveUser = () => {
      authApi
        .getUser()
        .then((user) => {
          if (!cancelled) setState({ loading: false, session: user ? { user } : null });
        })
        .catch(() => {
          Promise.resolve(authApi.signOut?.())
            .catch(() => {})
            .finally(() => {
              if (!cancelled) setState({ loading: false, session: null });
            });
        });
    };

    const stop = authApi.onAuthStateChange((session) => {
      if (!session) {
        if (!cancelled) setState({ loading: false, session: null });
        return;
      }
      resolveUser();
    });

    resolveUser();

    return () => {
      cancelled = true;
      stop?.();
    };
  }, [authApi]);

  if (!authApi) return <Outlet />;

  if (state.loading) {
    return (
      <div className="admin-page">
        <main className="admin-main"><p className="admin-loading">관리자 인증을 확인하는 중…</p></main>
      </div>
    );
  }

  if (!state.session) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
