import React from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import DashboardPage from './pages/DashboardPage';
import GalleriesPage from './pages/GalleriesPage';
import GalleryDetailPage from './pages/gallery-detail/GalleryDetailPage';
import CustomerView from './pages/gallery-detail/CustomerView';
import PortfoliosPage from './pages/PortfoliosPage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';
import { useBrandFavicon } from './hooks/useBrandFavicon';

/* Layout wrapper that renders MainLayout with an Outlet for child routes */
const AdminLayout = () => (
  <MainLayout>
    <Outlet />
  </MainLayout>
);

function App() {
  useBrandFavicon();

  return (
    <Router>
      <Routes>
        {/* Full-screen pages - no layout */}
        <Route path="/login" element={<LoginPage />} />

        {/* Admin pages with shared layout */}
        <Route element={<AdminLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/galleries" element={<GalleriesPage />} />
          <Route path="/galleries/:slug" element={<GalleryDetailPage />} />
          <Route path="/portfolios" element={<PortfoliosPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/shop" element={<div className="p-4 text-center">Shop Funktionalität kommt bald...</div>} />
        </Route>

        {/* Customer view - clean URL /:slug (lower priority than static routes above) */}
        <Route path="/:slug" element={<CustomerView />} />
      </Routes>
    </Router>
  );
}

export default App;
