import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { GalleryProvider } from './contexts/GalleryContext';
import MainLayout from './components/layout/MainLayout';
import CookieConsent from './components/CookieConsent';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './contexts/ToastContext';
import { BrandProvider } from './contexts/BrandContext';
import { useBrandFavicon } from './hooks/useBrandFavicon';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

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

// ── Custom Domain Detection ──
// Configurable: change to 'app.fotohahn.ch' after Scrappbook migration
const GALLERY_BASE_DOMAIN = import.meta.env.VITE_GALLERY_BASE_DOMAIN || 'galerie.fotohahn.ch';
const ADMIN_DOMAIN = import.meta.env.VITE_ADMIN_DOMAIN || 'admin.fotohahn.ch';

function getDomainMode() {
  const hostname = window.location.hostname;
  // localhost / dev = normal admin mode
  if (hostname === 'localhost' || hostname === '127.0.0.1') return null;
  // Admin domain = normal admin mode
  if (hostname === ADMIN_DOMAIN) return null;
  // Internal Tailscale hostname = normal admin mode
  if (hostname.endsWith('.ts.net')) return null;
  // Subdomain of gallery base: e.g. "kunde1.galerie.fotohahn.ch"
  if (hostname.endsWith('.' + GALLERY_BASE_DOMAIN)) {
    const subdomain = hostname.replace('.' + GALLERY_BASE_DOMAIN, '');
    return { type: 'subdomain', slug: subdomain, domain: hostname };
  }
  // Exact gallery base domain: e.g. "galerie.fotohahn.ch" itself
  if (hostname === GALLERY_BASE_DOMAIN) return null;
  // Any other domain = custom domain: e.g. "app.kundenfirma.ch"
  return { type: 'custom', domain: hostname };
}

function AppContent() {
  useBrandFavicon();
  useKeyboardShortcuts();

  // Check if we're on a custom domain or subdomain
  const domainMode = getDomainMode();

  // Custom domain or subdomain → render CustomerView directly (no admin routes)
  if (domainMode) {
    return (
      <>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/legal/:type" element={<LegalPage />} />
            <Route path="*" element={<CustomerView domainMode={domainMode} />} />
          </Routes>
        </Suspense>
        <CookieConsent />
      </>
    );
  }

  // Normal admin mode
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
      <ErrorBoundary>
        <AuthProvider>
          <BrandProvider>
            <GalleryProvider>
              <ToastProvider>
                <AppContent />
              </ToastProvider>
            </GalleryProvider>
          </BrandProvider>
        </AuthProvider>
      </ErrorBoundary>
    </Router>
  );
}

export default App;
