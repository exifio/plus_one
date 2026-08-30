import React from 'react';

export const AdminDashboardPage: React.FC = () => {
  return (
    <div className="admin-dashboard-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">신청 목록 관리</h1>
        <p className="admin-page-subtitle">접수된 보관상품 판매 신청 현황입니다.</p>
      </div>

      <div className="card admin-empty-card">
        <p>신청 데이터 목록이 F-07 단계에서 구현됩니다.</p>
      </div>
    </div>
  );
};
