import { getRecruitmentStatusInfo } from '../domain/recruitmentStatus';

/**
 * paused / closed / 조회 실패 상태의 판매자 안내 UI. (DESIGN 41.5)
 *
 * status가 알 수 없는 값이거나 조회에 실패한 경우
 * 허용 방향 fallback이 아닌 안전한 안내 문구를 표시한다.
 */
export default function RecruitmentNotice({ status, children }) {
  const info = getRecruitmentStatusInfo(status);

  return (
    <section className="recruitment-notice" role="status">
      <h2 className="recruitment-notice-title">{info.sellerTitle}</h2>
      <p className="recruitment-notice-desc">{info.sellerDescription}</p>
      {children}
    </section>
  );
}
