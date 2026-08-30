import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BrandBadge } from '../../components/BrandBadge';

export const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/admin');
  };

  return (
    <div className="admin-login-page">
      <div className="login-card">
        <div className="login-header">
          <BrandBadge />
          <h1 className="login-title">관리자 로그인</h1>
          <p className="login-desc">Frontend Phase Mock 로그인</p>
        </div>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="admin-id">아이디</label>
            <input 
              id="admin-id" 
              type="text" 
              defaultValue="admin" 
              className="form-input" 
              readOnly 
            />
          </div>
          <div className="form-group">
            <label htmlFor="admin-pw">비밀번호</label>
            <input 
              id="admin-pw" 
              type="password" 
              defaultValue="******" 
              className="form-input" 
              readOnly 
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block">
            로그인 (Mock)
          </button>
        </form>
      </div>
    </div>
  );
};
