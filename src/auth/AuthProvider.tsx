import { MsalProvider, useMsal } from '@azure/msal-react';
import type { Configuration, AccountInfo } from '@azure/msal-browser';
import { PublicClientApplication, InteractionRequiredAuthError } from '@azure/msal-browser';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { msalConfig, loginRequest } from './authConfig.js';

// Type assertion with proper configuration check
const assertMsalConfig = (config: unknown): config is Configuration => {
  return (
    config !== null &&
    typeof config === 'object' &&
    'auth' in (config as Configuration)
  );
};

export const msalInstance = new PublicClientApplication(
  assertMsalConfig(msalConfig) ? msalConfig : { auth: { clientId: '' } }
);

// Token refresh buffer time (5 minutes before expiration)
const TOKEN_REFRESH_BUFFER = 5 * 60 * 1000;

interface AuthContextType {
  isAuthenticated: boolean;
  user: AccountInfo | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
  error: Error | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Helper to check if token is expired or about to expire
const isTokenExpired = (tokenExpiresOn: number): boolean => {
  const now = new Date().getTime();
  return tokenExpiresOn - now < TOKEN_REFRESH_BUFFER;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const { instance, accounts } = useMsal();

  // Get token silently, with refresh if needed
  const getTokenSilently = useCallback(async (): Promise<string | null> => {
    try {
      if (accounts.length === 0) {
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

  // Check authentication status on mount and when accounts change
  useEffect(() => {
    const checkAuth = async () => {
      setLoading(true);
      try {
        if (accounts.length > 0) {
          const account = accounts[0];
          setUser(account);
          setIsAuthenticated(true);

          // Pre-fetch token to ensure it's fresh
          await getTokenSilently();
        } else {
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setError(error instanceof Error ? error : new Error('Authentication check failed'));
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [accounts, getTokenSilently]);

  // Handle login
  const login = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await instance.loginPopup(loginRequest);
      if (response.account) {
        setUser(response.account);
        setIsAuthenticated(true);

        // Cache the initial token
        if (response.accessToken) {
          const expiresOn = response.expiresOn?.getTime() || Date.now() + 3600000;
          localStorage.setItem('msalToken', response.accessToken);
          localStorage.setItem('msalTokenExpiry', expiresOn.toString());
        }
      }
    } catch (error) {
      console.error('Login failed:', error);
      setError(error instanceof Error ? error : new Error('Login failed'));
      throw error;
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

/**
 * Hook to use the auth context
 * @returns AuthContextType with authentication state and methods
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthWrapperProps {
  children: ReactNode;
}

/**
 * Wrapper component that provides MSAL and Auth contexts
 */
export const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => (
  <MsalProvider instance={msalInstance}>
    <AuthProvider>{children}</AuthProvider>
  </MsalProvider>
);

export type { AuthContextType };
