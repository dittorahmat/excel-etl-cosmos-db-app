import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from './auth/useAuth';
import { AuthWrapper } from './auth/AuthWrapper';
import { LoginPage } from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import { UploadPage } from './pages/UploadPage';
import { MainLayout } from './components/layout/MainLayout';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

// Scroll to top on route change
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

// Loading spinner component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Loader2 className="h-8 w-8 animate-spin" />
    <span className="ml-2">Loading...</span>
  </div>
);

// Protected Route component
const ProtectedRoute = () => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  console.log('ProtectedRoute: isAuthenticated=', isAuthenticated, 'loading=', loading);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    console.log('ProtectedRoute: Not authenticated, redirecting to /login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

// Public route that redirects to dashboard if already authenticated
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    console.log('PublicRoute useEffect: isAuthenticated=', isAuthenticated, 'loading=', loading);
  }, [isAuthenticated, loading]);

  if (loading) {
    console.log('PublicRoute: Loading...');
    return <LoadingSpinner />;
  }

  if (isAuthenticated) {
    console.log('PublicRoute: Authenticated, redirecting to /dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  console.log('PublicRoute: Not authenticated, rendering children.');
  return <>{children}</>;
};

// Main App Content
const AppContent = () => {
  return (
    <Router>
      <ScrollToTop />
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={
            <MainLayout>
              <Outlet />
            </MainLayout>
          }>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Route>
      </Routes>
    </Router>
  );
};

// App wrapped with AuthWrapper
const App = () => (
  <AuthWrapper>
    <AppContent />
  </AuthWrapper>
);

export default App;
