import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Typography,
  CircularProgress,
  Alert,
  Stack,
  Divider,
} from '@mui/material';
import { Lock as LockIcon } from '@mui/icons-material';

export const LoginPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      await login();
      navigate(from, { replace: true });
    } catch (err) {
      console.error('Login failed:', err);
      setError(
        err instanceof Error ? err.message : 'An error occurred during login'
      );
    } finally {
      setLoading(false);
    }
  };

  if (isAuthenticated) {
    navigate(from, { replace: true });
    return null;
  }

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Card sx={{ width: '100%', maxWidth: 400, p: 2 }}>
          <CardContent>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                mb: 3,
              }}
            >
              <LockIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
              <Typography component="h1" variant="h5">
                Sign in
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <Stack spacing={2}>
              <Button
                fullWidth
                variant="contained"
                color="primary"
                onClick={handleLogin}
                disabled={loading}
                startIcon={
                  loading ? <CircularProgress size={20} color="inherit" /> : null
                }
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
                By signing in, you agree to our Terms of Service and Privacy
                Policy.
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default LoginPage;
