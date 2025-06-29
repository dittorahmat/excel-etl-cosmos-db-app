import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { CircularProgress, Box, Typography } from '@mui/material';
export const ProtectedRoute = ({ children, requiredRole }) => {
    const { isAuthenticated, loading, user } = useAuth();
    const navigate = useNavigate();
    useEffect(() => {
        if (!loading && !isAuthenticated) {
            navigate('/login', { replace: true });
        }
    }, [isAuthenticated, loading, navigate]);
    if (loading) {
        return (_jsxs(Box, { display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minHeight: "100vh", children: [_jsx(CircularProgress, {}), _jsx(Typography, { variant: "body1", mt: 2, children: "Authenticating..." })] }));
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
            return (_jsxs(Box, { display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minHeight: "100vh", children: [_jsx(Typography, { variant: "h5", color: "error", children: "Unauthorized Access" }), _jsx(Typography, { variant: "body1", mt: 2, children: "You don't have permission to access this page." })] }));
        }
    }
    return _jsx(_Fragment, { children: children });
};
