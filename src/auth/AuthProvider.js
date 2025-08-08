import { jsx as _jsx } from "react/jsx-runtime";
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { InteractionRequiredAuthError, EventType } from '@azure/msal-browser';
import { useMsal } from '@azure/msal-react';
import { AuthContext } from './AuthContext';
import { loginRequest } from './authConfig.ts';
import { isTokenExpired } from './authUtils';
/**
 * AuthProvider component that provides authentication context to the application.
 * Handles both development and production authentication flows.
 */
const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { instance, accounts } = useMsal();
    const authCheckComplete = useRef(false);
    // Get token silently, with refresh if needed
    const getTokenSilently = useCallback(async () => {
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
        }
        catch (error) {
            if (error instanceof InteractionRequiredAuthError) {
                // If silent acquisition fails, try interactive login
                try {
                    const popupResponse = await instance.acquireTokenPopup(loginRequest);
                    if (popupResponse.accessToken) {
                        const expiresOn = popupResponse.expiresOn?.getTime() || Date.now() + 3600000;
                        localStorage.setItem('msalToken', popupResponse.accessToken);
                        localStorage.setItem('msalTokenExpiry', expiresOn.toString());
                        return popupResponse.accessToken;
                    }
                }
                catch (popupError) {
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
                if (import.meta.env.DEV && import.meta.env.VITE_AUTH_ENABLED === 'false') {
                    const mockUser = localStorage.getItem('mockUser');
                    if (mockUser) {
                        const parsedUser = JSON.parse(mockUser);
                        console.log('AuthProvider: DEV mode - Mock user found:', parsedUser.username);
                        setUser(parsedUser);
                        setIsAuthenticated(true);
                        console.log('AuthProvider: DEV mode - isAuthenticated set to TRUE after mock user found.');
                    }
                    else {
                        console.log('AuthProvider: DEV mode - No mock user found.');
                        setIsAuthenticated(false);
                        console.log('AuthProvider: DEV mode - isAuthenticated set to FALSE after no mock user found.');
                    }
                }
                else {
                    // MSAL-based authentication for both local development and production
                    const currentAccounts = instance.getAllAccounts();
                    if (currentAccounts.length > 0) {
                        const account = currentAccounts[0];
                        console.log('AuthProvider: MSAL account found:', account.username);
                        setUser(account);
                        setIsAuthenticated(true);
                        await getTokenSilently();
                    }
                    else {
                        console.log('AuthProvider: No MSAL account found.');
                        setIsAuthenticated(false);
                    }
                }
            }
            catch (err) {
                console.error('AuthProvider: Authentication check failed:', err);
                setError(err instanceof Error ? err : new Error('Authentication error'));
                setIsAuthenticated(false);
            }
            finally {
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
        if (import.meta.env.DEV && import.meta.env.VITE_AUTH_ENABLED === 'false') {
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
        }
        catch (error) {
            console.error('Login failed:', error);
            setError(error instanceof Error ? error : new Error('Login failed'));
            throw error;
        }
        finally {
            setLoading(false);
        }
    }, [instance]);
    // Handle logout
    const logout = useCallback(async () => {
        setLoading(true);
        try {
            if (import.meta.env.DEV && import.meta.env.VITE_AUTH_ENABLED === 'false') {
                // In development with auth disabled, clear the mock auth
                console.log('Running in development mode with mock logout');
                localStorage.removeItem('mockUser');
                setUser(null);
                setIsAuthenticated(false);
            }
            else {
                // Standard MSAL logout
                await instance.logoutPopup();
                setUser(null);
                setIsAuthenticated(false);
            }
        }
        catch (error) {
            console.error('Logout failed:', error);
            setError(error instanceof Error ? error : new Error('Logout failed'));
            throw error;
        }
        finally {
            setLoading(false);
        }
    }, [instance]);
    // Note: getAccessToken is an alias for getTokenSilently for backward compatibility
    // Expose the auth context
    const contextValue = useMemo(() => ({
        isAuthenticated,
        user,
        login,
        logout,
        getAccessToken: getTokenSilently, // Alias for backward compatibility
        getTokenSilently,
        error,
        loading,
    }), [isAuthenticated, user, login, logout, getTokenSilently, error, loading]);
    return (_jsx(AuthContext.Provider, { value: contextValue, children: children }));
};
export { AuthProvider };
