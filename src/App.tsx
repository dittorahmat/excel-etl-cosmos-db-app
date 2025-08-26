import * as React from 'react';
import { lazy, Suspense, useEffect, ReactNode, FC } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from './auth/useAuth';
import { AuthWrapper } from './auth/AuthWrapper';
import { MainLayout } from './components/layout/MainLayout';
import { Loader2 } from 'lucide-react';

// Extend the Window interface to include our custom properties
declare global {
  interface Window {
    FORCE_DUMMY_AUTH?: boolean;
    USE_DUMMY_AUTH?: boolean;
    SKIP_MSAL_INIT?: boolean;
    APP_CONFIG?: {
      auth?: {
        useDummyAuth?: boolean;
      };
    };
    ENV?: {
      VITE_AUTH_ENABLED?: string;
      AUTH_ENABLED?: string;
      NODE_ENV?: string;
      MODE?: string;
      VITE_AZURE_CLIENT_ID?: string;
      VITE_AZURE_REDIRECT_URI?: string;
      VITE_AZURE_TENANT_ID?: string;
    };
  }
}

// Debugging React version and environment
console.log('React version:', React.version);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('Build time:', new Date().toISOString());

// Lazy load page components
const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ApiKeyManagementPage = lazy(() => import('./pages/ApiKeyManagementPage'));
const UploadPage = lazy(() => import('./pages/UploadPage'));
const ApiQueryBuilderPage = lazy(() => import('./pages/ApiQueryBuilderPage'));

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
  
  // Check if dummy auth is enabled from multiple sources
  const useDummyAuth = 
    window.FORCE_DUMMY_AUTH === true || 
    window.USE_DUMMY_AUTH === true ||
    (window.APP_CONFIG?.auth?.useDummyAuth === true) ||
    localStorage.getItem('useDummyAuth') === 'true';
    
  console.log('ProtectedRoute - Dummy Auth Flags:', {
    USE_DUMMY_AUTH: (window as any).USE_DUMMY_AUTH,
    FORCE_DUMMY_AUTH: (window as any).FORCE_DUMMY_AUTH,
    APP_CONFIG_AUTH: (window as any).APP_CONFIG?.auth,
    LOCAL_STORAGE: localStorage.getItem('useDummyAuth')
  });
  
  console.log('ProtectedRoute - useDummyAuth:', useDummyAuth);

  // If using dummy auth, always allow access
  if (useDummyAuth) {
    console.log('ProtectedRoute: Using dummy auth, allowing access');
    return <Outlet />;
  }

  // Show loading spinner while checking auth status
  if (loading) {
    console.log('ProtectedRoute: Loading auth status...');
    return <LoadingSpinner />;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    console.log('ProtectedRoute: Not authenticated, redirecting to /login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // User is authenticated, render the protected route
  console.log('ProtectedRoute: User is authenticated, allowing access');
  return <Outlet />;
};

// Public route that redirects to dashboard if already authenticated or if dummy auth is enabled
const PublicRoute: FC<{ children: ReactNode }> = ({ children }) => {
  // Use the auth context with default values
  const {
    isAuthenticated = false,
    loading = true,
    user = null,
    error = null
  } = useAuth(); // This will throw if not within an AuthProvider
  
  // Check if dummy auth is enabled from multiple sources
  const useDummyAuth = 
    window.FORCE_DUMMY_AUTH === true || 
    window.USE_DUMMY_AUTH === true || 
    window.APP_CONFIG?.auth?.useDummyAuth === true ||
    localStorage.getItem('useDummyAuth') === 'true';
  
  // Log all the values for debugging
  console.log('PublicRoute - Dummy Auth Flags:', {
    USE_DUMMY_AUTH: window.USE_DUMMY_AUTH,
    FORCE_DUMMY_AUTH: window.FORCE_DUMMY_AUTH,
    APP_CONFIG_AUTH: window.APP_CONFIG?.auth,
    LOCAL_STORAGE: localStorage.getItem('useDummyAuth'),
    windowFlags: {
      USE_DUMMY_AUTH: window.USE_DUMMY_AUTH,
      FORCE_DUMMY_AUTH: window.FORCE_DUMMY_AUTH,
      APP_CONFIG: window.APP_CONFIG,
      ENV: window.ENV
    }
  });
  
  console.log('PublicRoute - useDummyAuth:', useDummyAuth);

  // Log when auth state changes
  useEffect(() => {
    console.log('PublicRoute - Auth state changed:', { 
      isAuthenticated, 
      loading, 
      user: user ? 'User exists' : 'No user',
      useDummyAuth,
      timestamp: new Date().toISOString() 
    });
    
    // If we're in dummy auth mode, log that we're forcing authentication
    if (useDummyAuth) {
      console.log('PublicRoute - Dummy auth mode is active, will redirect to dashboard');
      console.log('PublicRoute - Current path:', window.location.pathname);
    }
  }, [isAuthenticated, loading, user, useDummyAuth]);

  // If dummy auth is enabled, redirect to dashboard immediately
  if (useDummyAuth) {
    console.log('PublicRoute: Dummy auth is enabled, checking if we need to redirect...');
    console.log('PublicRoute: Current path:', window.location.pathname);
    
    // Only redirect if we're not already on the dashboard
    if (window.location.pathname !== '/dashboard') {
      console.log('PublicRoute: Redirecting to /dashboard');
      return <Navigate to="/dashboard" replace />;
    } else {
      console.log('PublicRoute: Already on dashboard, rendering children');
      return <>{children}</>;
    }
  }

  // Show loading spinner while checking auth status
  if (loading) {
    console.log('PublicRoute: Loading authentication state...');
    return <LoadingSpinner />;
  }

  // If authenticated, redirect to dashboard
  if (isAuthenticated) {
    console.log('PublicRoute: User is authenticated, checking if we need to redirect to /dashboard');
    console.log('PublicRoute: Current path:', window.location.pathname);
    
    // Only redirect if we're not already on the dashboard
    if (window.location.pathname !== '/dashboard') {
      console.log('PublicRoute: Redirecting to /dashboard');
      return <Navigate to="/dashboard" replace />;
    } else {
      console.log('PublicRoute: Already on dashboard, rendering children');
      return <>{children}</>;
    }
  }
  
  // If we get here, user is not authenticated and dummy auth is disabled
  console.log('PublicRoute: User is not authenticated and dummy auth is disabled, showing login page');
  console.log('PublicRoute: Current path:', window.location.pathname);
  
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
            <Route path="/api-query-builder" element={<ApiQueryBuilderPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Route>
      </Routes>
      </Suspense>
    </Router>
  );
};

// App wrapped with AuthWrapper
const App: FC = () => {
  return (
    <AuthWrapper>
      <AppContent />
    </AuthWrapper>
  );
};
export default App;
