import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { GalleryProvider } from './contexts/GalleryContext';
import MainLayout from './components/layout/MainLayout';
import CookieConsent from './components/CookieConsent';
import { useBrandFavicon } from './hooks/useBrandFavicon';

// ── Lazy-loaded pages (code splitting) ──
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));
const GalleriesPage = React.lazy(() => import('./pages/GalleriesPage'));
const GalleryDetailPage = React.lazy(() => import('./pages/gallery-detail/GalleryDetailPage'));
const CustomerView = React.lazy(() => import('./pages/gallery-detail/CustomerView'));
const PortfoliosPage = React.lazy(() => import('./pages/PortfoliosPage'));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage'));
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const RegisterPage = React.lazy(() => import('./pages/RegisterPage'));
const ForgotPasswordPage = React.lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = React.lazy(() => import('./pages/ResetPasswordPage'));
const LegalPage = React.lazy(() => import('./pages/LegalPage'));

// ── Suspense fallback ──
const PageLoader = () => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minHeight: '100vh', background: '#f5f5f5',
    fontFamily: 'Inter, sans-serif', color: '#666',
  }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: 40, height: 40,
        border: '3px solid #e0e0e0', borderTopColor: '#528c68',
        borderRadius: '50%', animation: 'spin 0.8s linear infinite',
        margin: '0 auto 1rem',
      }} />
      <p>Laden...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  </div>
);

/* Protected route wrapper - redirects to login if not authenticated */
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

/* Layout wrapper that renders MainLayout with an Outlet for child routes */
const AdminLayout = () => (
  <MainLayout>
    <Outlet />
  </MainLayout>
);

function AppContent() {
  useBrandFavicon();

  return (
    <>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public auth pages - no layout */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/legal/:type" element={<LegalPage />} />

          {/* Protected admin pages with shared layout */}
          <Route element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }>
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
      </Suspense>
      <CookieConsent />
    </>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <GalleryProvider>
          <AppContent />
        </GalleryProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
