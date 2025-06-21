import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider.js';
import { CircularProgress, Box, Typography } from '@mui/material';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: string;
}

export const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { isAuthenticated, loading, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  if (loading) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
        <Typography variant="body1" mt={2}>
          Authenticating...
        </Typography>
      </Box>
    );
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
      return (
        <Box
          display="flex"
          flexDirection="column"
          justifyContent="center"
          alignItems="center"
          minHeight="100vh"
        >
          <Typography variant="h5" color="error">
            Unauthorized Access
          </Typography>
          <Typography variant="body1" mt={2}>
            You don't have permission to access this page.
          </Typography>
        </Box>
      );
    }
  }

  return <>{children}</>;
};
