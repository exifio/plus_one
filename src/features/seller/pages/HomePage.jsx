import { Link } from 'react-router-dom';
import { useServer } from '../../server/ServerContext';
import { useRecruitmentStatus } from '../../recruitment/useRecruitmentStatus';
import RecruitmentNotice from '../../recruitment/components/RecruitmentNotice';

/**
 * 판매자 Home.
 *
 * 진입 시 모집 상태를 확인한다. (명세 §11)
 * - open: 기존 Home UI와 CTA 유지
 * - paused / closed: CTA를 모집 상태 안내 UI로 대체
 * - 조회 실패: 신청을 허용하지 않고 안전한 오류 안내를 표시
 */
export default function HomePage() {
  const { saleRequestApi } = useServer();
  const { status, error } = useRecruitmentStatus(saleRequestApi);

  const isRecruiting = status === 'open';
  const isBlocked = status === 'paused' || status === 'closed';

  return (
    <div className="home-page">
      <header className="brand-header">
        <Link to="/" className="brand-logo" aria-label="홈으로 이동">
          <span className="brand-logo-plus">+</span>
          <span className="brand-logo-num">1</span>
        </Link>
      </header>

      {isBlocked ? (
        <RecruitmentNotice status={status} />
      ) : (
        <>
          <section className="hero">
            <h1 className="hero-title">
              남은 +1 보관상품,
              <br />
              원하는 가격에 판매해보세요
            </h1>
            <p className="hero-sub">
              더 이상 안 쓰는 나만의 냉장고/포켓CU 보관상품을
              <br />
              간편하게 신청하고 판매를 진행할 수 있습니다.
            </p>
          </section>

          <section className="home-guide">
            <ol>
              <li><span className="guide-num">1</span>판매할 상품을 등록해요</li>
              <li><span className="guide-num">2</span>보관 중인 화면을 올려요</li>
              <li><span className="guide-num">3</span>확인 후 연락드려요</li>
            </ol>
          </section>

          <section className="home-supported">
            <p>
              현재 <strong>GS25 · CU</strong>
              <br />
              1+1 · 2+1 상품을 등록할 수 있어요.
            </p>
          </section>

          {error && <RecruitmentNotice status="unknown" />}
        </>
      )}

      <div className="home-cta-bar">
        {isRecruiting ? (
          <Link to="/sell" className="btn-primary btn-lg">
            판매 등록 시작
          </Link>
        ) : (
          // 모집 상태가 확인되기 전이거나 paused/closed/조회 실패인 경우 신청 진입을 막는다.
          <button type="button" className="btn-primary btn-lg" disabled>
            판매 등록 시작
          </button>
        )}
      </div>
    </div>
  );
}
