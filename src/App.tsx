import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { SellerLayout } from './layouts/SellerLayout';
import { AdminLayout } from './layouts/AdminLayout';
import { LandingPage } from './pages/seller/LandingPage';
import { ApplyPage } from './pages/seller/ApplyPage';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminApplicationsPage } from './pages/admin/AdminApplicationsPage';
import { NotFoundPage } from './pages/NotFoundPage';

export const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<SellerLayout />}>
        <Route index element={<LandingPage />} />
        <Route path="apply" element={<ApplyPage />} />
      </Route>

      <Route path="/admin/login" element={<AdminLoginPage />} />

      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminApplicationsPage />} />
        <Route path="recruitment" element={<AdminApplicationsPage />} />
        <Route path="metrics" element={<AdminApplicationsPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default App;
