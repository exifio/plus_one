import React from 'react';
import { Link, Outlet } from 'react-router-dom';

export const SellerLayout: React.FC = () => {
  return (
    <div className="seller-app">
      <header className="seller-header">
        <div className="seller-header-container">
          <Link to="/" className="brand-logo" aria-label="1+ 홈으로 이동">
            <span className="brand-badge">1+</span>
            <span className="brand-title">원플러스</span>
          </Link>
        </div>
      </header>
      <main className="seller-main">
        <div className="seller-content-container">
          <Outlet />
        </div>
      </main>
      <footer className="seller-footer">
        <div className="seller-footer-container">
          <p className="footer-notice">편의점 보관상품 안전 판매 신청 서비스</p>
          <p className="footer-copy">&copy; 1+ (원플러스). All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};
