import * as React from 'react';
import { lazy, Suspense, useEffect, ReactNode, FC } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import { useAuth } from './auth/useAuth';
import { AuthWrapper } from './auth/AuthWrapper';
import { MainLayout } from './components/layout/MainLayout';
import { Loader2 } from 'lucide-react';
import { Toaster } from './components/ui/toaster';

// Debugging React version and environment
console.log('React version:', React.version);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('Build time:', new Date().toISOString());

// Lazy load page components
const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ApiKeyManagementPage = lazy(() => import('./pages/ApiKeyManagementPage'));
const UploadPage = lazy(() => import('./pages/UploadPage'));
const QueryBuilderPage = lazy(() => import('./pages/QueryBuilderPage'));

// Scroll to top on route change
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

// Loading spinner component
const LoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Loader2 className="h-8 w-8 animate-spin" />
    <span className="ml-2">Loading...</span>
  </div>
);

// Protected Route component
const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  
  // Check if dummy auth is enabled
  const useDummyAuth = import.meta.env.VITE_AUTH_ENABLED === 'false' || 
                      (!import.meta.env.VITE_AUTH_ENABLED && import.meta.env.DEV);

  // If using dummy auth, always allow access
  if (useDummyAuth) {
    return <Outlet />;
  }

  // Show loading spinner while checking auth status
  if (loading) {
    return <LoadingSpinner />;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // User is authenticated, render the protected route
  return <Outlet />;
};

// Public route that redirects to dashboard if already authenticated or if dummy auth is enabled
const PublicRoute: FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  // Check if dummy auth is enabled
  const useDummyAuth = import.meta.env.VITE_AUTH_ENABLED === 'false' || 
                      (!import.meta.env.VITE_AUTH_ENABLED && import.meta.env.DEV);

  // If dummy auth is enabled, redirect to dashboard immediately
  if (useDummyAuth) {
    // Only redirect if we're not already on the dashboard
    if (window.location.pathname !== '/dashboard') {
      return <Navigate to="/dashboard" replace />;
    } else {
      return <>{children}</>;
    }
  }

  // Show loading spinner while checking auth status
  if (loading) {
    return <LoadingSpinner />;
  }

  // If authenticated, redirect to dashboard
  if (isAuthenticated) {
    // Only redirect if we're not already on the dashboard
    if (window.location.pathname !== '/dashboard') {
      return <Navigate to="/dashboard" replace />;
    } else {
      return <>{children}</>;
    }
  }
  
  // If not authenticated, render the children (login page)
  return <>{children}</>;
};

// Main App Content
const AppContent: FC = () => {
  return (
    <Router>
      <ScrollToTop />
      <Suspense fallback={<LoadingSpinner />}>
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
            <Route path="/api-keys" element={<ApiKeyManagementPage />} />
            <Route path="/api-query-builder" element={<QueryBuilderPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Route>
      </Routes>
      </Suspense>
    </Router>
  );
};

// App wrapped with ThemeProvider and AuthWrapper
const App = () => {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <AuthWrapper>
        <AppContent />
        <Toaster />
      </AuthWrapper>
    </ThemeProvider>
  );
};
export default App;
