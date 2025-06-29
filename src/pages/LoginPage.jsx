import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Button, Card, CardContent, Container, Typography, CircularProgress, Stack, Divider } from '@mui/material';
import { Lock as LockIcon } from '@mui/icons-material';

export const LoginPage = () => {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from?.pathname || '/';

    // Handle login redirect
    const handleLogin = () => {
        setLoading(true);
        
        if (import.meta.env.DEV) {
            console.log('Running in development mode with mock login');
            // Mock user for development
            const mockUser = {
                clientPrincipal: {
                    identityProvider: 'dev',
                    userId: 'dev-user',
                    userDetails: 'dev@example.com',
                    userRoles: ['authenticated', 'anonymous']
                }
            };
            localStorage.setItem('mockUser', JSON.stringify(mockUser));
            navigate(from, { replace: true });
            return;
        }
        
        // In production, use the real auth flow
        window.location.href = `/.auth/login/aad?post_login_redirect_uri=${encodeURIComponent(window.location.origin + from)}`;
    };

    // Check if user is already authenticated
    useEffect(() => {
        const checkAuth = async () => {
            try {
                // In development, use mock authentication
                if (import.meta.env.DEV) {
                    console.log('Running in development mode with mock auth check');
                    // Check if we have a mock user in localStorage for development
                    const mockUser = localStorage.getItem('mockUser');
                    if (mockUser) {
                        navigate(from, { replace: true });
                    }
                    return;
                }
                
                // In production, use the real auth endpoint
                const response = await fetch('/.auth/me');
                if (!response.ok) {
                    throw new Error(`Auth check failed with status: ${response.status}`);
                }
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
    return (
        <Container component="main" maxWidth="xs">
            <Box sx={{
                marginTop: 8,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
            }}>
                <Card sx={{ width: '100%', maxWidth: 400, p: 2 }}>
                    <CardContent>
                        <Box sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            mb: 3,
                        }}>
                            <LockIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                            <Typography component="h1" variant="h5">
                                Sign in
                            </Typography>
                        </Box>
                        <Stack spacing={2}>
                            <Button
                                fullWidth
                                variant="contained"
                                color="primary"
                                onClick={handleLogin}
                                disabled={loading}
                                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
                                sx={{
                                    py: 1.5,
                                    textTransform: 'none',
                                    fontSize: '1rem',
                                }}
                            >
                                {loading ? 'Signing in...' : 'Sign in with Microsoft'}
                            </Button>
                            <Divider sx={{ my: 2 }}>or</Divider>
                            <Typography variant="body2" color="textSecondary" align="center">
                                By signing in, you agree to our Terms of Service and Privacy Policy.
                            </Typography>
                        </Stack>
                    </CardContent>
                </Card>
            </Box>
        </Container>
    );
};
export default LoginPage;
