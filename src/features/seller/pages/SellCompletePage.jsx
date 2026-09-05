import { Link } from 'react-router-dom';

export default function SellCompletePage() {
  return (
    <div className="complete-page">
      <div className="complete-check" aria-hidden="true">✓</div>
      <h1 className="complete-title">판매 신청이 접수됐어요</h1>
      <p className="complete-desc">
        등록해주신 상품을 확인한 뒤
        <br />
        입력하신 연락처로 연락드릴게요.
      </p>

      <Link to="/" className="btn-secondary btn-lg btn-full">
        홈으로
      </Link>
    </div>
  );
}
