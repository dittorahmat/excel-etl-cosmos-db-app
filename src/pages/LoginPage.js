import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Button, Card, CardContent, Container, Typography, CircularProgress, Alert, Stack, Divider } from '@mui/material';
import { Lock as LockIcon } from '@mui/icons-material';

export const LoginPage = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from?.pathname || '/';

    // Handle login redirect
    const handleLogin = () => {
        setLoading(true);
        window.location.href = `/.auth/login/aad?post_login_redirect_uri=${encodeURIComponent(window.location.origin + from)}`;
    };

    // Check if user is already authenticated
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const response = await fetch('/.auth/me');
                const payload = await response.json();
                if (payload.clientPrincipal) {
                    navigate(from, { replace: true });
                }
            } catch (err) {
                console.error('Auth check failed:', err);
            }
        };
        
        checkAuth();
    }, [navigate, from]);
    return (_jsx(Container, { component: "main", maxWidth: "xs", children: _jsx(Box, { sx: {
                marginTop: 8,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
            }, children: _jsx(Card, { sx: { width: '100%', maxWidth: 400, p: 2 }, children: _jsxs(CardContent, { children: [_jsxs(Box, { sx: {
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                mb: 3,
                            }, children: [_jsx(LockIcon, { color: "primary", sx: { fontSize: 40, mb: 1 } }), _jsx(Typography, { component: "h1", variant: "h5", children: "Sign in" })] }), error && (_jsx(Alert, { severity: "error", sx: { mb: 3 }, children: error })), _jsxs(Stack, { spacing: 2, children: [_jsx(Button, { fullWidth: true, variant: "contained", color: "primary", onClick: handleLogin, disabled: loading, startIcon: loading ? _jsx(CircularProgress, { size: 20, color: "inherit" }) : null, sx: {
                                        py: 1.5,
                                        textTransform: 'none',
                                        fontSize: '1rem',
                                    }, children: loading ? 'Signing in...' : 'Sign in with Microsoft' }), _jsx(Divider, { sx: { my: 2 }, children: "or" }), _jsx(Typography, { variant: "body2", color: "textSecondary", align: "center", children: "By signing in, you agree to our Terms of Service and Privacy Policy." })] })] }) }) }) }));
};
export default LoginPage;
