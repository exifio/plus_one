import React, { useEffect, useState } from 'react';
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BrandBadge } from '../components/BrandBadge';
import {
  getAdminSession,
  signOutAdmin,
  subscribeToAuthChanges,
} from '../services/authService';
import { isSupabaseConfigured } from '../services/supabaseClient';

export const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [access, setAccess] = useState<'checking' | 'allowed' | 'denied'>(
    isSupabaseConfigured ? 'checking' : 'allowed',
  );

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    let active = true;
    const checkAccess = async () => {
      try {
        const session = await getAdminSession();
        if (active) {
          setAccess(session ? 'allowed' : 'denied');
        }
      } catch {
        if (active) {
          setAccess('denied');
        }
      }
    };

    void checkAccess();
    const unsubscribe = subscribeToAuthChanges((session) => {
      if (!session) {
        setAccess('denied');
        return;
      }
      window.setTimeout(() => void checkAccess(), 0);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  if (isSupabaseConfigured && access === 'checking') {
    return (
      <main className="admin-main">
        <div className="admin-content-container admin-loading-card">관리자 권한을 확인하고 있어요.</div>
      </main>
    );
  }

  if (isSupabaseConfigured && access === 'denied') {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  const handleLogout = async () => {
    try {
      await signOutAdmin();
    } finally {
      navigate('/admin/login', { replace: true });
    }
  };

  return (
    <div className="admin-app">
      <header className="admin-header">
        <div className="admin-header-container">
          <div className="admin-brand">
            <Link to="/admin" className="brand-logo">
              <BrandBadge />
              <span className="admin-title">관리자 콘솔</span>
            </Link>
          </div>
          <nav className="admin-nav">
            <NavLink 
              to="/admin" 
              end
              className={({ isActive }) => isActive ? 'admin-nav-item active' : 'admin-nav-item'}
            >
              신청 목록
            </NavLink>
            <NavLink 
              to="/admin/recruitment" 
              className={({ isActive }) => isActive ? 'admin-nav-item active' : 'admin-nav-item'}
            >
              모집 관리
            </NavLink>
            <NavLink 
              to="/admin/metrics" 
              className={({ isActive }) => isActive ? 'admin-nav-item active' : 'admin-nav-item'}
            >
              실험 현황
            </NavLink>
            <Link to="/" className="admin-nav-item exit-link" target="_blank" rel="noreferrer">
              판매자 화면 ↗
            </Link>
            {isSupabaseConfigured && (
              <button type="button" className="admin-nav-item admin-logout" onClick={handleLogout}>
                로그아웃
              </button>
            )}
          </nav>
        </div>
      </header>
      <main className="admin-main">
        <div className="admin-content-container">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
