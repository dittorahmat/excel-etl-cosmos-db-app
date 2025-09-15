import React, { useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { AccountInfo, InteractionRequiredAuthError, EventType, EventMessage, AuthenticationResult } from '@azure/msal-browser';
import { useMsal } from '@azure/msal-react';
import { AuthContext, type AuthContextType } from './AuthContext';
import { getSimpleLoginRequest } from './simpleAuthConfig';
import { isTokenExpired } from './authUtils';

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * AuthProvider component that provides authentication context to the application.
 * Handles both development and production authentication flows with AUTH_ENABLED flag support.
 */
const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { instance, accounts } = useMsal();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Check if we should use dummy auth (development, explicitly disabled, or forced)
  const isDevelopment = import.meta.env.DEV || 
                      window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1';
  
  // Check if auth is enabled or disabled
  const authEnabled = import.meta.env.VITE_AUTH_ENABLED === 'true';
  const authDisabled = import.meta.env.VITE_AUTH_ENABLED === 'false';
  
  // Use dummy auth only if:
  // 1. Auth is explicitly disabled, OR
  // 2. We're in development and auth is not explicitly enabled
  const useDummyAuth = authDisabled || (!authEnabled && isDevelopment);
  
  // Mock user data for when auth is disabled
  const MOCK_USER = {
    name: isDevelopment ? 'Development User' : 'User',
    username: isDevelopment ? 'dev@example.com' : 'user@example.com',
    roles: ['user', ...(isDevelopment ? ['admin'] : [])]
  };

  // Mock account info for when auth is disabled
  const MOCK_ACCOUNT: AccountInfo = {
    homeAccountId: 'mock-account-id',
    localAccountId: 'mock-local-account-id',
    environment: 'mock-environment',
    tenantId: 'mock-tenant-id',
    username: MOCK_USER.username,
    name: MOCK_USER.name,
    idTokenClaims: {
      name: MOCK_USER.name,
      preferred_username: MOCK_USER.username,
      roles: MOCK_USER.roles,
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      iat: Math.floor(Date.now() / 1000)
    }
  };

  // If authentication is disabled, return a mock context
  if (useDummyAuth) {
    const mockContext: AuthContextType = {
      isAuthenticated: true,
      user: MOCK_ACCOUNT,
      loading: false,
      error: null,
      getAccessToken: async () => {
        // Generate a mock token
        const mockToken = btoa(JSON.stringify({
          header: { alg: 'HS256', typ: 'JWT' },
          payload: {
            sub: 'mock-user-123',
            name: MOCK_USER.name,
            email: MOCK_USER.username,
            roles: MOCK_USER.roles,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
          }
        }));
        return `mock.${mockToken}.signature`;
      },
      login: () => Promise.resolve(),
      logout: () => Promise.resolve()
    };

    return (
      <AuthContext.Provider value={mockContext}>
        {children}
      </AuthContext.Provider>
    );
  }

  // Get authentication token (silently or interactively if needed)
  const getTokenSilently = useCallback(async (): Promise<string | null> => {
    if (useDummyAuth) {
      // Generate a mock token for development or when auth is disabled
      const mockUser = {
        name: isDevelopment ? 'Development User' : 'User',
        username: isDevelopment ? 'dev@example.com' : 'user@example.com',
        roles: ['user', ...(isDevelopment ? ['admin'] : [])]
      };

      const mockToken = btoa(JSON.stringify({
        header: { alg: 'HS256', typ: 'JWT' },
        payload: {
          sub: isDevelopment ? 'dev-user-123' : 'user-123',
          name: mockUser.name,
          email: mockUser.username,
          roles: mockUser.roles,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
        }
      }));

      return `mock.${mockToken}.signature`;
    }

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
    
    try {
      // Get new token silently
      const response = await instance.acquireTokenSilent({
        ...getSimpleLoginRequest(),
        account,
      });
      
      // Cache the new token
      if (response?.accessToken) {
        const expiresOn = response.expiresOn?.getTime() || Date.now() + 3600000; // Default 1 hour
        localStorage.setItem('msalToken', response.accessToken);
        localStorage.setItem('msalTokenExpiry', expiresOn.toString());
        return response.accessToken;
      }
      return null;
    } catch (error) {
      if (error instanceof InteractionRequiredAuthError) {
        // If silent acquisition fails, try interactive login
        try {
          const popupResponse = await instance.acquireTokenPopup(getSimpleLoginRequest());
          if (popupResponse?.accessToken) {
            const expiresOn = popupResponse.expiresOn?.getTime() || Date.now() + 3600000;
            localStorage.setItem('msalToken', popupResponse.accessToken);
            localStorage.setItem('msalTokenExpiry', expiresOn.toString());
            return popupResponse.accessToken;
          }
        } catch (popupError) {
          console.error('Error acquiring token interactively:', popupError);
          throw popupError;
        }
      }
      console.error('Token acquisition failed:', error);
      throw error;
    }
  }, [instance, accounts, useDummyAuth, isDevelopment]);

  // Login function
  const login = useCallback(async (): Promise<AuthenticationResult | null> => {
    if (useDummyAuth) {
      const mockUser = {
        homeAccountId: 'mock-account-id',
        environment: 'mock-environment',
        tenantId: 'mock-tenant-id',
        username: isDevelopment ? 'dev@example.com' : 'user@example.com',
        localAccountId: 'mock-local-account-id',
        name: isDevelopment ? 'Development User' : 'User',
        idTokenClaims: {
          name: isDevelopment ? 'Development User' : 'User',
          preferred_username: isDevelopment ? 'dev@example.com' : 'user@example.com',
          roles: ['user', ...(isDevelopment ? ['admin'] : [])]
        }
      } as unknown as AccountInfo;
      setUser(mockUser);
      setIsAuthenticated(true);
      return Promise.resolve({ account: mockUser } as AuthenticationResult);
    }

    try {
      setLoading(true);
      const response = await instance.loginPopup(getSimpleLoginRequest());
      setUser(response.account || null);
      setIsAuthenticated(!!response.account);
      return response;
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Login failed'));
      throw error;
    } finally {
      setLoading(false);
    }
  }, [instance, useDummyAuth, isDevelopment]);

  // Logout function
  const logout = useCallback(async (): Promise<void> => {
    if (useDummyAuth) {
      setUser(null);
      setIsAuthenticated(false);
      return Promise.resolve();
    }
    
    try {
      setLoading(true);
      await instance.logout();
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('msalToken');
      localStorage.removeItem('msalTokenExpiry');
      return Promise.resolve();
    } catch (error) {
      console.error('Logout failed:', error);
      setError(error instanceof Error ? error : new Error('Logout failed'));
      throw error;
    } finally {
      setLoading(false);
    }
  }, [instance, useDummyAuth]);

  // Check authentication state on mount and when accounts change
  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (useDummyAuth) {
          // Set up mock user for development or when auth is disabled
          const mockUser = {
            homeAccountId: 'mock-account-id',
            environment: 'mock-environment',
            tenantId: 'mock-tenant-id',
            username: isDevelopment ? 'dev@example.com' : 'user@example.com',
            localAccountId: 'mock-local-account-id',
            name: isDevelopment ? 'Development User' : 'User',
            idTokenClaims: {
              name: isDevelopment ? 'Development User' : 'User',
              preferred_username: isDevelopment ? 'dev@example.com' : 'user@example.com',
              roles: ['user', ...(isDevelopment ? ['admin'] : [])]
            }
          } as unknown as AccountInfo;
          setUser(mockUser);
          setIsAuthenticated(true);
          setLoading(false);
          return;
        }

        // Handle real authentication flow
        if (accounts.length > 0) {
          const account = accounts[0];
          setUser(account);
          setIsAuthenticated(true);
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
        setLoading(false);
      } catch (error) {
        console.error('Error checking authentication:', error);
        setError(error instanceof Error ? error : new Error('Authentication check failed'));
        setLoading(false);
      }
    };

    checkAuth();

    // Set up MSAL event callbacks
    const callbackId = instance.addEventCallback((message: EventMessage) => {
      switch (message.eventType) {
        case EventType.LOGIN_SUCCESS:
        case EventType.ACQUIRE_TOKEN_SUCCESS: {
          // The payload should be an AuthenticationResult which contains the account
          const payload = message.payload as AuthenticationResult | undefined;
          const account = payload?.account;
          if (account) {
            setUser(account);
            setIsAuthenticated(true);
          }
          break;
        }
        case EventType.LOGOUT_SUCCESS:
        case EventType.ACQUIRE_TOKEN_FAILURE:
          setUser(null);
          setIsAuthenticated(false);
          break;
        default:
          break;
      }
    });

    return () => {
      if (callbackId) {
        instance.removeEventCallback(callbackId);
      }
    };
  }, [instance, accounts, useDummyAuth, isDevelopment]);

  // Provide the auth context
  const contextValue = useMemo<AuthContextType>(
    () => ({
      isAuthenticated,
      user,
      error,
      loading,
      login: login as () => Promise<AuthenticationResult | void>,
      logout,
      getAccessToken: getTokenSilently,
      getTokenSilently
    }),
    [isAuthenticated, user, error, loading, getTokenSilently, login, logout]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
