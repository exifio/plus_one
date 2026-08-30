import React from 'react';
import { Link } from 'react-router-dom';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="not-found-page">
      <div className="card text-center">
        <h1 className="title-404">404</h1>
        <h2>페이지를 찾을 수 없습니다</h2>
        <p className="desc-404">요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.</p>
        <div style={{ marginTop: '24px' }}>
          <Link to="/" className="btn btn-primary">
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
};
