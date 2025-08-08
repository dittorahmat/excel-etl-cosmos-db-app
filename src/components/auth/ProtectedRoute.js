import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { Loader2 } from 'lucide-react';
export const ProtectedRoute = ({ children, requiredRole }) => {
    const { isAuthenticated, loading, user } = useAuth();
    const navigate = useNavigate();
    useEffect(() => {
        if (!loading && !isAuthenticated) {
            navigate('/login', { replace: true });
        }
    }, [isAuthenticated, loading, navigate]);
    if (loading) {
        return (_jsxs("div", { className: "flex flex-col justify-center items-center min-h-screen", children: [_jsx(Loader2, { className: "h-8 w-8 animate-spin" }), _jsx("p", { className: "mt-2", children: "Authenticating..." })] }));
    }
    if (!isAuthenticated) {
        return null; // Redirecting in useEffect
    }
    // Check for required role if specified
    if (requiredRole && user?.idTokenClaims?.roles) {
        const userRoles = Array.isArray(user.idTokenClaims.roles)
            ? user.idTokenClaims.roles
            : [user.idTokenClaims.roles];
        if (!userRoles.includes(requiredRole)) {
            return (_jsxs("div", { className: "flex flex-col justify-center items-center min-h-screen", children: [_jsx("h1", { className: "text-2xl font-bold text-red-600", children: "Unauthorized Access" }), _jsx("p", { className: "mt-2", children: "You don't have permission to access this page." })] }));
        }
    }
    return _jsx(_Fragment, { children: children });
};
