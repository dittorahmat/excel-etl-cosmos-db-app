import { jsx as _jsx } from "react/jsx-runtime";
import { MsalProvider, useMsal } from '@azure/msal-react';
import { PublicClientApplication, InteractionRequiredAuthError } from '@azure/msal-browser';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { msalConfig, loginRequest } from './authConfig';
import { assertMsalConfig, isTokenExpired } from './authUtils';
// Create MSAL instance
export const msalInstance = new PublicClientApplication(assertMsalConfig(msalConfig) ? msalConfig : { auth: { clientId: '' } });
const AuthContext = createContext(null);
const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
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
                if (accounts.length > 0) {
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
        }
        catch (error) {
            console.error('Login failed:', error);
            setError(error instanceof Error ? error : new Error('Login failed'));
            throw error;
        }
        finally {
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
        }
        catch (error) {
            console.error('Logout failed:', error);
            setError(error instanceof Error ? error : new Error('Logout failed'));
            throw error;
        }
        finally {
            setLoading(false);
        }
    };
    // Get access token with automatic refresh
    const getAccessToken = useCallback(async () => {
        try {
            return await getTokenSilently();
        }
        catch (error) {
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
/**
 * Hook to use the auth context
 * @returns AuthContextType with authentication state and methods
 */
const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
/**
 * Wrapper component that provides MSAL and Auth contexts
 */
const AuthWrapper = ({ children }) => (_jsx(MsalProvider, { instance: msalInstance, children: _jsx(AuthProvider, { children: children }) }));
export { AuthProvider, useAuth, AuthWrapper };
