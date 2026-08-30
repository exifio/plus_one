import React from 'react';
import { Link } from 'react-router-dom';

export const ApplyPage: React.FC = () => {
  return (
    <div className="apply-page">
      <div className="page-header">
        <Link to="/" className="back-link">&larr; 처음으로</Link>
        <h1 className="page-title">판매 신청</h1>
        <p className="page-desc">보관상품 정보와 희망 판매 가격을 입력해주세요.</p>
      </div>
      <div className="card form-placeholder-card">
        <p className="placeholder-text">판매 신청 폼이 F-03 단계에서 구현됩니다.</p>
      </div>
    </div>
  );
};
