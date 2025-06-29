import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";



import { Box, Button, Card, CardContent, Container, Typography, Stack, Divider } from '@mui/material';
import { Lock as LockIcon } from '@mui/icons-material';


import { useAuth } from '../auth/useAuth';
export const LoginPage = () => {
    const { login } = useAuth();

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
                                onClick={() => {
                                    console.log('LoginPage: Sign in button clicked.');
                                    login();
                                }}
                                sx={{
                                    py: 1.5,
                                    textTransform: 'none',
                                    fontSize: '1rem',
                                }}
                            >
                                {'Sign in with Microsoft'}
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
