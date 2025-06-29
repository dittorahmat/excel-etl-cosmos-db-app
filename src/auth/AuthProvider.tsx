import { jsx as _jsx } from "react/jsx-runtime";
import { MsalProvider, useMsal } from '@azure/msal-react';
import { PublicClientApplication, InteractionRequiredAuthError, AccountInfo } from '@azure/msal-browser';
import React, { createContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { msalConfig, loginRequest } from './authConfig';
import { assertMsalConfig, isTokenExpired } from './authUtils';

// Define types for the auth context
export interface AuthContextType {
  isAuthenticated: boolean;
  user: AccountInfo | null;
  loading: boolean;
  error: Error | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getTokenSilently: () => Promise<string | null>;
}

// Create MSAL instance with proper type assertion
export const msalInstance = new PublicClientApplication(
  assertMsalConfig(msalConfig) ? msalConfig : { auth: { clientId: '' } }
) as PublicClientApplication;

// Create context with proper type
export const AuthContext = createContext<AuthContextType | null>(null);
interface AuthProviderProps {
  children: ReactNode;
}

const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [user, setUser] = useState<AccountInfo | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);
    const { instance, accounts } = useMsal();
    // Get token silently, with refresh if needed
    const getTokenSilently = useCallback(async () => {
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
        }
        catch (error) {
            if (error instanceof InteractionRequiredAuthError) {
                // If silent acquisition fails, try interactive login
                try {
                    const response = await instance.acquireTokenPopup(loginRequest);
                    return response.accessToken || null;
                }
                catch (popupError) {
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
                const currentAccounts = instance.getAllAccounts();
                if (currentAccounts && currentAccounts.length > 0) {
                    const account = accounts[0];
                    setUser(account);
                    setIsAuthenticated(true);
                    // Pre-fetch token to ensure it's fresh
                    await getTokenSilently();
                }
                else {
                    setIsAuthenticated(false);
                    setUser(null);
                }
            }
            catch (error) {
                console.error('Auth check error:', error);
                setError(error instanceof Error ? error : new Error('Authentication check failed'));
                setIsAuthenticated(false);
                setUser(null);
            }
            finally {
                setLoading(false);
            }
        };
        checkAuth();
  }, [accounts, getTokenSilently, instance]);
    // Handle login
  const login = async () => {
    setLoading(true);
    setError(null);
    try {
      // In development, use mock authentication
      if (import.meta.env.DEV) {
        console.log('Running in development mode with mock login');
        const mockAccount = {
          homeAccountId: 'mock-account-id',
          environment: 'login.microsoftonline.com',
          tenantId: 'mock-tenant-id',
          username: 'dev@example.com',
          localAccountId: 'mock-local-account-id',
          name: 'Dev User',
          idTokenClaims: {
            name: 'Dev User',
            preferred_username: 'dev@example.com',
            oid: 'mock-oid',
            tid: 'mock-tid'
          }
        };
        setUser(mockAccount);
        setIsAuthenticated(true);
        localStorage.setItem('mockAuth', 'true');
        return;
      }

      // In production, use the real MSAL login
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
      // In development, just clear the mock auth
      if (import.meta.env.DEV) {
        console.log('Running in development mode with mock logout');
        localStorage.removeItem('mockAuth');
        localStorage.removeItem('mockUser');
        setUser(null);
        setIsAuthenticated(false);
        return;
      }

      // In production, use the real MSAL logout
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
  const getAccessToken = useCallback(async () => {
    try {
      // In development, return a mock token
      if (import.meta.env.DEV) {
        console.log('Running in development mode with mock token');
        return 'mock-access-token';
      }
      
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
    return (_jsx(AuthContext.Provider, { value: value, children: children }));
};
// Define AuthWrapper props interface
interface AuthWrapperProps {
    children: ReactNode;
}

/**
 * Wrapper component that provides MSAL and Auth contexts
 */
const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => (
    _jsx(MsalProvider, { 
        instance: msalInstance, 
        children: _jsx(AuthProvider, { children: children }) 
    })
);

// Custom hook to use the auth context
export const useAuth = (): AuthContextType => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export { AuthProvider, AuthWrapper };
