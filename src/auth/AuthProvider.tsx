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

    // Get token silently, with refresh if needed
    const getTokenSilently = useCallback(async (): Promise<string | null> => {
        try {
            if (import.meta.env.DEV) {
                // In development, return a mock token that looks like a JWT
                // This is a placeholder and should not be used for actual security.
                return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkRldiBVc2VyIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
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
    }, [instance, accounts]);

    // Check authentication status on mount and when accounts change
    useEffect(() => {
        const checkAuth = async () => {
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
                    // Production flow: Check Azure Static Web Apps authentication first
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
                        console.error('Auth check failed (Azure Static Web Apps):', error);
                    }

                    // Fallback to MSAL accounts if AWA auth not found
                    const currentAccounts = instance.getAllAccounts();
                    if (currentAccounts.length > 0) {
                        const account = currentAccounts[0];
                        console.log('AuthProvider: PROD mode - MSAL account found:', account.username);
                        setUser(account);
                        setIsAuthenticated(true);
                        // Get a token to verify it's still valid
                        await getTokenSilently();
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

        checkAuth();
    }, [instance, accounts, getTokenSilently]);

    // Add event listeners for MSAL account changes
    useEffect(() => {
        const callbackId = instance.addEventCallback((message) => {
            console.log('MSAL Event:', message.eventType);
            if (message.eventType === EventType.LOGIN_SUCCESS || 
                message.eventType === EventType.LOGOUT_SUCCESS || 
                message.eventType === EventType.ACQUIRE_TOKEN_SUCCESS) {
                window.location.reload();
            }
        });

        return () => {
            if (callbackId) {
                instance.removeEventCallback(callbackId);
            }
        };
    }, [instance]);

    

    

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
