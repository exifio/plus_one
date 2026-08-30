import React from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';

export const AdminLayout: React.FC = () => {
  return (
    <div className="admin-app">
      <header className="admin-header">
        <div className="admin-header-container">
          <div className="admin-brand">
            <Link to="/admin" className="brand-logo">
              <span className="brand-badge">1+</span>
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
