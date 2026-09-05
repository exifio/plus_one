import { NavLink } from 'react-router-dom';

/**
 * Admin 최소 Navigation. (DESIGN §3)
 *
 * 별도 Layout/Sidebar 없이 헤더에 "판매 신청 / 모집 관리 / 실험 현황"
 * 세 영역 링크만 제공한다. (AGENTS §15)
 */
export default function AdminNav() {
  return (
    <nav className="admin-nav" aria-label="관리자 메뉴">
      <NavLink to="/admin" end className="admin-nav-link">
        판매 신청
      </NavLink>
      <NavLink to="/admin/recruitment" className="admin-nav-link">
        모집 관리
      </NavLink>
      <NavLink to="/admin/experiment" className="admin-nav-link">
        실험 현황
      </NavLink>
    </nav>
  );
}
