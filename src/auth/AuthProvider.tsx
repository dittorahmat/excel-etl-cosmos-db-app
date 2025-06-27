import type { AccountInfo } from '@azure/msal-browser';
import { InteractionRequiredAuthError } from '@azure/msal-browser';
import { useEffect, useState, useCallback } from 'react';
import { loginRequest } from './authConfig.custom';
import { isTokenExpired } from './authUtils';
import { AuthProviderProps } from './auth.types';
import { useMsal } from '@azure/msal-react';
import { AuthContext } from './useAuth';





const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const { instance, accounts } = useMsal();

  // Get token silently, with refresh if needed
  const getTokenSilently = useCallback(async (): Promise<string | null> => {
    try {
      console.log('getTokenSilently called with accounts:', accounts);
      if (accounts.length === 0) {
        console.warn('No active accounts found');
        throw new Error('No active account');
      }

      const account = accounts[0];
      const cachedToken = localStorage.getItem('msalToken');
      const tokenExpiry = localStorage.getItem('msalTokenExpiry');

      // Check if we have a valid cached token
      if (cachedToken && tokenExpiry && !isTokenExpired(parseInt(tokenExpiry, 10))) {
        return cachedToken;
      }

      // Get new token
      const response = await instance.acquireTokenSilent({
        ...loginRequest,
        account,
      });

      // Cache the new token
      if (response.accessToken) {
        const expiresOn = response.expiresOn?.getTime() || Date.now() + 3600000; // Default 1 hour
        localStorage.setItem('msalToken', response.accessToken);
        localStorage.setItem('msalTokenExpiry', expiresOn.toString());
      }

      return response.accessToken || null;
    } catch (error) {
      if (error instanceof InteractionRequiredAuthError) {
        // If silent acquisition fails, try interactive login
        try {
          const response = await instance.acquireTokenPopup(loginRequest);
          return response.accessToken || null;
        } catch (popupError) {
          console.error('Popup login failed:', popupError);
          throw popupError;
        }
      }
      console.error('Token acquisition failed:', error);
      throw error;
    }
  }, [accounts, instance]);

  // Check auth state on mount and account changes
  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('Initializing MSAL instance');
        await instance.initialize();
        console.log('MSAL instance initialized, checking accounts');
        const accounts = instance.getAllAccounts();
        console.log('Found accounts:', accounts);
        setUser(accounts[0] || null);
        const isAuth = accounts.length > 0;
        console.log('Setting isAuthenticated to:', isAuth);
        setIsAuthenticated(isAuth);

        if (isAuth) {
          console.log('User is authenticated, attempting to get token');
          const token = await getTokenSilently().catch(err => {
            console.warn('Failed to get token silently:', err);
            return null;
          });
          console.log('Token retrieval result:', token ? 'Success' : 'Failed');
        }
      } catch (err) {
        const error = err as Error;
        console.error('Auth check error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack,
          additionalInfo: (error as MsalError).errorCode || (error as MsalError).errorMessage || 'No additional info'
        });
        setError(error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [accounts, getTokenSilently, instance]);

  // Handle login
  const login = async () => {
    setLoading(true);
    setError(null);
    console.log('Initiating login with request:', loginRequest);
    
    try {
      // First, try to get token silently to check if user is already authenticated
      try {
        const tokenResponse = await instance.acquireTokenSilent({
          scopes: loginRequest.scopes || []
        });
        console.log('Acquired token silently:', tokenResponse);
        setUser(instance.getAllAccounts()[0] || null);
        setIsAuthenticated(true);
        return;
      } catch (_silentError) {
        console.log('Silent token acquisition failed, proceeding with redirect');
      }

      // If silent token acquisition fails, proceed with interactive login
      await instance.loginRedirect({
        ...loginRequest,
        onRedirectNavigate: (url) => {
          console.log('Redirecting to:', url);
          return true;
        }
      });
    } catch (error) {
      const err = error as Error;
      const errorDetails = {
        name: err.name,
        message: err.message,
        stack: err.stack,
        additionalInfo: (err as MsalError).errorCode || (err as MsalError).errorMessage || 'No additional info',
        timestamp: new Date().toISOString()
      };
      
      console.error('Login error details:', errorDetails);
      setError(new Error(`Login failed: ${err.message}`));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Handle logout
  const logout = async () => {
    setLoading(true);
    try {
      await instance.logoutPopup();
      // Clear all auth data
      localStorage.removeItem('msalToken');
      localStorage.removeItem('msalTokenExpiry');
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout failed:', error);
      setError(error instanceof Error ? error : new Error('Logout failed'));
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Get access token with automatic refresh
  const getAccessToken = useCallback(async (): Promise<string | null> => {
    try {
      return await getTokenSilently();
    } catch (error) {
      console.error('Failed to get access token:', error);
      setError(error instanceof Error ? error : new Error('Failed to get access token'));
      return null;
    }
  }, [getTokenSilently]);

  // Expose the auth context
  const value = {
    isAuthenticated,
    user,
    login,
    logout,
    getAccessToken,
    error,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};





export default AuthProvider;
