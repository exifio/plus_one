import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BrandBadge } from '../../components/BrandBadge';
import { ADMIN_NOT_AUTHORIZED, signInAdmin } from '../../services/authService';
import { isSupabaseConfigured } from '../../services/supabaseClient';

export const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(isSupabaseConfigured ? '' : 'admin');
  const [password, setPassword] = useState(isSupabaseConfigured ? '' : '******');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      navigate('/admin');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await signInAdmin(email, password);
      const from = (location.state as { from?: string } | null)?.from ?? '/admin';
      navigate(from, { replace: true });
    } catch (err: unknown) {
      setError(
        err instanceof Error && err.message === ADMIN_NOT_AUTHORIZED
          ? '관리자 권한이 있는 계정으로 로그인해주세요.'
          : '이메일 또는 비밀번호를 확인해주세요.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="admin-login-page">
      <div className="login-card">
        <div className="login-header">
          <BrandBadge />
          <h1 className="login-title">관리자 로그인</h1>
          <p className="login-desc">
            {isSupabaseConfigured ? '관리자 계정으로 로그인해주세요.' : 'Frontend Phase Mock 로그인'}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="admin-id">이메일</label>
            <input
              id="admin-id"
              type={isSupabaseConfigured ? 'email' : 'text'}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              placeholder="admin@example.com"
              className="form-input"
              readOnly={!isSupabaseConfigured}
              required={isSupabaseConfigured}
            />
          </div>
          <div className="form-group">
            <label htmlFor="admin-pw">비밀번호</label>
            <input
              id="admin-pw"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              className="form-input"
              readOnly={!isSupabaseConfigured}
              required={isSupabaseConfigured}
            />
          </div>
         {error && <p className="form-error" role="alert">{error}</p>}
          <button type="submit" className="btn btn-primary btn-lg btn-block">
            {isSubmitting ? '로그인 중...' : isSupabaseConfigured ? '로그인' : '로그인 (Mock)'}
          </button>
        </form>
      </div>
    </div>
  );
};
