import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { lazy, Suspense, useEffect } from 'react'; // Another force deploy
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from './auth/useAuth';
import { AuthWrapper } from './auth/AuthWrapper';
import { MainLayout } from './components/layout/MainLayout';
import { Loader2 } from 'lucide-react';
// Lazy load page components
const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ApiKeyManagementPage = lazy(() => import('./pages/ApiKeyManagementPage'));
const UploadPage = lazy(() => import('./pages/UploadPage'));
import ApiQueryBuilderPage from './pages/ApiQueryBuilderPage';
// Scroll to top on route change
const ScrollToTop = () => {
    const { pathname } = useLocation();
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);
    return null;
};
// Loading spinner component
const LoadingSpinner = () => (_jsxs("div", { className: "flex items-center justify-center min-h-screen", children: [_jsx(Loader2, { className: "h-8 w-8 animate-spin" }), _jsx("span", { className: "ml-2", children: "Loading..." })] }));
// Protected Route component
const ProtectedRoute = () => {
    const { isAuthenticated, loading } = useAuth();
    const location = useLocation();
    console.log('ProtectedRoute: isAuthenticated=', isAuthenticated, 'loading=', loading);
    if (loading) {
        return _jsx(LoadingSpinner, {});
    }
    if (!isAuthenticated) {
        console.log('ProtectedRoute: Not authenticated, redirecting to /login');
        return _jsx(Navigate, { to: "/login", state: { from: location }, replace: true });
    }
    return _jsx(Outlet, {});
};
// Public route that redirects to dashboard if already authenticated
const PublicRoute = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();
    useEffect(() => {
        console.log('PublicRoute useEffect: isAuthenticated=', isAuthenticated, 'loading=', loading);
    }, [isAuthenticated, loading]);
    if (loading) {
        console.log('PublicRoute: Loading...');
        return _jsx(LoadingSpinner, {});
    }
    if (isAuthenticated) {
        console.log('PublicRoute: Authenticated, redirecting to /dashboard');
        return _jsx(Navigate, { to: "/dashboard", replace: true });
    }
    console.log('PublicRoute: Not authenticated, rendering children.');
    return _jsx(_Fragment, { children: children });
};
// Main App Content
const AppContent = () => {
    return (_jsxs(Router, { children: [_jsx(ScrollToTop, {}), _jsx(Suspense, { fallback: _jsx(LoadingSpinner, {}), children: _jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: _jsx(PublicRoute, { children: _jsx(LoginPage, {}) }) }), _jsx(Route, { element: _jsx(ProtectedRoute, {}), children: _jsxs(Route, { element: _jsx(MainLayout, { children: _jsx(Outlet, {}) }), children: [_jsx(Route, { path: "/", element: _jsx(DashboardPage, {}) }), _jsx(Route, { path: "/upload", element: _jsx(UploadPage, {}) }), _jsx(Route, { path: "/api-keys", element: _jsx(ApiKeyManagementPage, {}) }), _jsx(Route, { path: "/api-query-builder", element: _jsx(ApiQueryBuilderPage, {}) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })] }) })] }) })] }));
};
// App wrapped with AuthWrapper
const App = () => (_jsx(AuthWrapper, { children: _jsx(AppContent, {}) }));
export default App;
