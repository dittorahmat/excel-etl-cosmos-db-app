import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { AuthWrapper, useAuth } from './auth/AuthProvider';
import { LoginPage } from './pages/LoginPage.jsx';
import { DashboardPage } from './pages/DashboardPage.js';
import { UploadPage } from './pages/UploadPage.js';
import { MainLayout } from './components/layout/MainLayout.js';
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
const LoadingSpinner = () => (_jsxs("div", { className: "flex items-center justify-center min-h-screen", children: [_jsx(Loader2, { className: "h-8 w-8 animate-spin" }), _jsx("span", { className: "ml-2", children: "Loading..." })] }));
// Protected Route component
const ProtectedRoute = () => {
    const { isAuthenticated, loading } = useAuth();
    const location = useLocation();
    if (loading) {
        return _jsx(LoadingSpinner, {});
    }
    if (!isAuthenticated) {
        return _jsx(Navigate, { to: "/login", state: { from: location }, replace: true });
    }
    return _jsx(Outlet, {});
};
// Public route that redirects to dashboard if already authenticated
const PublicRoute = ({ children }) => {
    const { isAuthenticated } = useAuth();
    const location = useLocation();
    const from = location.state?.from?.pathname || '/';
    if (isAuthenticated) {
        return _jsx(Navigate, { to: from, replace: true });
    }
    return _jsx(_Fragment, { children: children });
};
// Main App Content
const AppContent = () => {
    return (_jsxs(Router, { children: [_jsx(ScrollToTop, {}), _jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: _jsx(PublicRoute, { children: _jsx(LoginPage, {}) }) }), _jsx(Route, { element: _jsx(ProtectedRoute, {}), children: _jsxs(Route, { element: _jsx(MainLayout, { children: _jsx(Outlet, {}) }), children: [_jsx(Route, { path: "/", element: _jsx(DashboardPage, {}) }), _jsx(Route, { path: "/upload", element: _jsx(UploadPage, {}) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })] }) })] })] }));
};
// App wrapped with AuthWrapper
const App = () => (_jsx(AuthWrapper, { children: _jsx(AppContent, {}) }));
export default App;
