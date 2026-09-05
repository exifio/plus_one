import { Route, Routes } from 'react-router-dom';
import { ServerContext } from './features/server/ServerContext';
import HomePage from './features/seller/pages/HomePage';
import SellPage from './features/seller/pages/SellPage';
import SellCompletePage from './features/seller/pages/SellCompletePage';
import AdminListPage from './features/admin/pages/AdminListPage';
import AdminDetailPage from './features/admin/pages/AdminDetailPage';
import AdminRecruitmentPage from './features/admin/pages/AdminRecruitmentPage';
import AdminExperimentPage from './features/admin/pages/AdminExperimentPage';

/**
 * 라우팅과 어댑터 주입만 담당한다.
 *
 * adapters는 composition root(main.jsx)에서 주입되므로
 * App은 fixture/supabase 같은 구체 구현을 알지 못한다.
 */
export default function App({ adapters }) {
  return (
    <ServerContext.Provider value={adapters}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/sell" element={<SellPage />} />
        <Route path="/sell/complete" element={<SellCompletePage />} />
        <Route path="/admin" element={<AdminListPage />} />
        <Route path="/admin/recruitment" element={<AdminRecruitmentPage />} />
        <Route path="/admin/experiment" element={<AdminExperimentPage />} />
        <Route path="/admin/:saleRequestId" element={<AdminDetailPage />} />
      </Routes>
    </ServerContext.Provider>
  );
}
