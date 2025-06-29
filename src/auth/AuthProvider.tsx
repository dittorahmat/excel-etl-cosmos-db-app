import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AccountInfo, InteractionRequiredAuthError, AuthenticationResult, EventType } from '@azure/msal-browser';
import { useMsal } from '@azure/msal-react';
import { AuthContext, AuthProviderProps, AuthContextType } from './AuthContext';
import { loginRequest } from './authConfig';
import { isTokenExpired } from './authUtils';



/**
 * AuthProvider component that provides authentication context to the application.
 * Handles both development and production authentication flows.
 */
const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [user, setUser] = useState<AccountInfo | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);
    const { instance, accounts } = useMsal();
    const authCheckComplete = useRef(false);

    useEffect(() => {
        const checkAuthentication = async () => {
            if (authCheckComplete.current) {
                console.log('AuthProvider: checkAuthentication skipped, already complete.');
                return;
            }

            console.log('AuthProvider: Starting authentication check...');
            try {
                if (import.meta.env.DEV) {
                    const mockUser = localStorage.getItem('mockUser');
                    if (mockUser) {
                        const parsedUser = JSON.parse(mockUser);
                        console.log('AuthProvider: DEV mode - Mock user found:', parsedUser.username);
                        setUser(parsedUser);
                        setIsAuthenticated(true);
                        console.log('AuthProvider: DEV mode - isAuthenticated set to TRUE after mock user found.');
                    } else {
                        console.log('AuthProvider: DEV mode - No mock user found.');
                        setIsAuthenticated(false);
                        console.log('AuthProvider: DEV mode - isAuthenticated set to FALSE after no mock user found.');
                    }
                } else {
                    // Production flow: Check MSAL accounts
                    const currentAccounts = instance.getAllAccounts();
                    if (currentAccounts.length > 0) {
                        const account = currentAccounts[0];
                        console.log('AuthProvider: PROD mode - MSAL account found:', account.username);
                        setUser(account);
                        setIsAuthenticated(true);
                    } else {
                        console.log('AuthProvider: PROD mode - No MSAL account found.');
                        setIsAuthenticated(false);
                    }
                }
            } catch (err) {
                console.error('AuthProvider: Authentication check failed:', err);
                setError(err instanceof Error ? err : new Error('Authentication error'));
                setIsAuthenticated(false);
            } finally {
                setLoading(false);
                authCheckComplete.current = true;
            }
        };

        

        // Add MSAL event listener for production flow
        let callbackId: string | null = null;
        if (!import.meta.env.DEV) {
            callbackId = instance.addEventCallback((message) => {
                console.log('MSAL Event:', message.eventType);
                switch (message.eventType) {
                    case EventType.LOGIN_SUCCESS:
                    case EventType.ACQUIRE_TOKEN_SUCCESS: {
                        const account = instance.getActiveAccount() || instance.getAllAccounts()[0];
                        if (account) {
                            console.log('MSAL login/acquire token success:', account);
                            setUser(account);
                            setIsAuthenticated(true);
                        }
                        break;
                    }
                    case EventType.LOGOUT_SUCCESS:
                        console.log('MSAL logout success');
                        setUser(null);
                        setIsAuthenticated(false);
                        localStorage.removeItem('msalToken');
                        localStorage.removeItem('msalTokenExpiry');
                        break;
                    case EventType.LOGIN_FAILURE:
                        console.error('MSAL login failed:', message.error);
                        setUser(null);
                        setIsAuthenticated(false);
                        setError(message.error);
                        break;
                    default:
                        break;
                }
            });
        }

        // Listen for storage changes to react to mock user changes
        const handleStorageChange = (event: StorageEvent) => {
            if (event.key === 'mockUser' && import.meta.env.DEV) {
                console.log('AuthProvider: Storage event for mockUser detected, re-checking auth.');
                checkAuthentication();
            }
        };
        window.addEventListener('storage', handleStorageChange);

        checkAuthentication();

        return () => {
            if (callbackId) {
                instance.removeEventCallback(callbackId);
            }
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [instance, accounts]);

    // Get token silently, with refresh if needed
    const getTokenSilently = useCallback(async (): Promise<string | null> => {
        try {
            if (import.meta.env.DEV) {
                // In development, return a mock token
                return 'dev-mock-token';
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
                return response.accessToken;
            }
            return null;
        } catch (error) {
            if (error instanceof InteractionRequiredAuthError) {
                // If silent acquisition fails, try interactive login
                try {
                    const popupResponse: AuthenticationResult = await instance.acquireTokenPopup(loginRequest);
                    if (popupResponse.accessToken) {
                        const expiresOn = popupResponse.expiresOn?.getTime() || Date.now() + 3600000;
                        localStorage.setItem('msalToken', popupResponse.accessToken);
                        localStorage.setItem('msalTokenExpiry', expiresOn.toString());
                        return popupResponse.accessToken;
                    }
                } catch (popupError) {
                    console.error('Interactive token acquisition failed:', popupError);
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
            // In production, we'll use Azure Static Web Apps authentication
            if (process.env.NODE_ENV !== 'development') {
                try {
                    const response = await fetch('/.auth/me');
                    if (response.ok) {
                        const authData = await response.json();
                        if (authData.clientPrincipal) {
                            setUser({
                                homeAccountId: authData.clientPrincipal.userId,
                                environment: 'login.microsoftonline.com',
                                tenantId: 'common',
                                username: authData.clientPrincipal.userDetails,
                                localAccountId: authData.clientPrincipal.userId,
                                name: authData.clientPrincipal.userDetails,
                                idTokenClaims: {
                                    name: authData.clientPrincipal.userDetails,
                                    preferred_username: authData.clientPrincipal.userDetails,
                                    oid: authData.clientPrincipal.userId,
                                    tid: 'common'
                                }
                            } as AccountInfo);
                            setIsAuthenticated(true);
                            setLoading(false);
                            return;
                        }
                    }
                } catch (error) {
                    console.error('Auth check failed:', error);
                }
                
                // If we get here, we're not authenticated in production
                setIsAuthenticated(false);
                setUser(null);
                setLoading(false);
                return;
            }
            
            // Development mode - use MSAL
            try {
                if (accounts.length > 0) {
                    const account = accounts[0];
                    setUser(account);
                    setIsAuthenticated(true);
                    // Get a token to verify it's still valid
                    await getTokenSilently();
                } else {
                    setIsAuthenticated(false);
                    setUser(null);
                }
            } catch (error) {
                console.error('Auth check failed:', error);
                setIsAuthenticated(false);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };
        
        checkAuth();
    }, [accounts, getTokenSilently, instance]);

    // Handle login
    const login = useCallback(async () => {
        if (import.meta.env.DEV) {
            console.log('AuthProvider: DEV mode - Performing mock login.');
            const mockUser = {
                homeAccountId: 'mock-account-id',
                environment: 'login.windows.net',
                tenantId: 'mock-tenant-id',
                username: 'dev@example.com',
                localAccountId: 'mock-local-account-id',
                name: 'Dev User',
                idTokenClaims: {
                    name: 'Dev User',
                    preferred_username: 'dev@example.com',
                    roles: ['authenticated', 'admin']
                }
            };
            localStorage.setItem('mockUser', JSON.stringify(mockUser));
            setUser(mockUser);
            setIsAuthenticated(true);
            setLoading(false);
            return;
        }
        
        setLoading(true);
        setError(null);
        try {
            const response = await instance.loginPopup(loginRequest);
            if (response.account) {
                setUser(response.account);
                setIsAuthenticated(true);
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
    }, [instance]);

    // Handle logout
    const logout = useCallback(async () => {
        setLoading(true);
        try {
            // In production, redirect to Azure AD logout
            if (process.env.NODE_ENV !== 'development') {
                window.location.href = '/.auth/logout';
                return;
            }
            
            // In development, clear the mock auth
            console.log('Running in development mode with mock logout');
            localStorage.removeItem('mockAuth');
            localStorage.removeItem('mockUser');
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
    }, []);

    // Note: getAccessToken is an alias for getTokenSilently for backward compatibility

    // Expose the auth context
    const contextValue: AuthContextType = useMemo(() => ({
        isAuthenticated,
        user,
        login,
        logout,
        getAccessToken: getTokenSilently, // Alias for backward compatibility
        getTokenSilently,
        error,
        loading,
    }), [isAuthenticated, user, login, logout, getTokenSilently, error, loading]);

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};

export { AuthProvider };
