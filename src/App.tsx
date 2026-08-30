import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { SellerLayout } from './layouts/SellerLayout';
import { AdminLayout } from './layouts/AdminLayout';
import { LandingPage } from './pages/seller/LandingPage';
import { ApplyPage } from './pages/seller/ApplyPage';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { NotFoundPage } from './pages/NotFoundPage';

export const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<SellerLayout />}>
        <Route index element={<LandingPage />} />
        <Route path="apply" element={<ApplyPage />} />
      </Route>

      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboardPage />} />
        <Route path="recruitment" element={<AdminDashboardPage />} />
        <Route path="metrics" element={<AdminDashboardPage />} />
      </Route>
      <Route path="/admin/login" element={<AdminLoginPage />} />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default App;

