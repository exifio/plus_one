import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useServer } from '../../server/ServerContext';

export default function AdminLoginPage() {
  const { authApi } = useServer();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ready, setReady] = useState(!authApi);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!authApi) return undefined;

    let cancelled = false;
    authApi.getUser()
      .then((user) => {
        if (cancelled) return;
        if (user) {
          navigate('/admin', { replace: true });
        } else {
          setReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });

    return () => { cancelled = true; };
  }, [authApi, navigate]);

  if (!authApi) return <Navigate to="/admin" replace />;
  if (!ready) {
    return (
      <div className="admin-page">
        <main className="admin-main"><p className="admin-loading">불러오는 중…</p></main>
      </div>
    );
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    setError(false);
    try {
      await authApi.signIn(email.trim(), password);
      navigate(location.state?.from || '/admin', { replace: true });
    } catch {
      setBusy(false);
      setError(true);
    }
  };

  return (
    <div className="admin-page admin-auth-page">
      <main className="admin-main">
        <section className="admin-auth-card">
          <span className="brand-logo">
            <span className="brand-logo-plus">+</span>
            <span className="brand-logo-num">1</span>
            <span className="brand-logo-suffix">관리자 페이지</span>
          </span>
          <h1 className="admin-title">관리자 로그인</h1>
          <form className="admin-auth-form" onSubmit={handleSubmit}>
            <label className="field-label" htmlFor="admin-email">이메일</label>
            <input
              id="admin-email"
              className="text-input"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <label className="field-label" htmlFor="admin-password">비밀번호</label>
            <input
              id="admin-password"
              className="text-input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            {error && (
              <p className="field-error" role="alert">
                로그인에 실패했어요. 이메일과 비밀번호를 확인해주세요.
              </p>
            )}
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? '로그인 중…' : '로그인'}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
