import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

/**
 * A component that wraps protected routes and handles authentication
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render if authenticated
 * @param {boolean} [props.requireAdmin=false] - Whether to require admin role
 * @returns {JSX.Element} The protected route component
 */
const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/.auth/me');
        const payload = await response.json();
        
        if (payload.clientPrincipal) {
          setIsAuthenticated(true);
          
          // If admin role is required, check if user has it
          if (requireAdmin) {
            const isAdmin = payload.clientPrincipal.userRoles?.includes('admin');
            setIsAuthorized(isAdmin);
          } else {
            setIsAuthorized(true);
          }
        } else {
          setIsAuthenticated(false);
          setIsAuthorized(false);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsAuthenticated(false);
        setIsAuthorized(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [requireAdmin]);

  if (isLoading) {
    // Show loading state
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login page with the return URL
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isAuthorized) {
    // User is authenticated but not authorized (missing required role)
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        textAlign: 'center',
        padding: '20px'
      }}>
        <h1>Access Denied</h1>
        <p>You don't have permission to access this page.</p>
      </div>
    );
  }

  // User is authenticated and authorized
  return children;
};

export default ProtectedRoute;
