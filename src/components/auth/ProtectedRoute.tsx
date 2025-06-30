import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { Loader2 } from 'lucide-react';

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
      <div className="flex flex-col justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="mt-2">Authenticating...</p>
      </div>
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
        <div className="flex flex-col justify-center items-center min-h-screen">
          <h1 className="text-2xl font-bold text-red-600">Unauthorized Access</h1>
          <p className="mt-2">You don't have permission to access this page.</p>
        </div>
      );
    }
  }

  return <>{children}</>;
};