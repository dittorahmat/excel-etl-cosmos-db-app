import { InteractionRequiredAuthError } from '@azure/msal-browser';
import { msalInstance } from '../auth/msalInstance';
export const getAuthToken = async () => {
    try {
        // In development, return a mock token
        if (import.meta.env.DEV) {
            console.log('Using development mock token');
            return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkRldiBVc2VyIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
        }

        // In production, get the real token
        const accounts = msalInstance.getAllAccounts();
        if (accounts.length === 0) {
            console.log('No accounts found');
            return null;
        }
        
        const silentRequest = {
            scopes: ['User.Read'],
            account: accounts[0],
            forceRefresh: false // Don't force refresh to avoid unnecessary token requests
        };
        
        console.log('Acquiring token silently...');
        const response = await msalInstance.acquireTokenSilent(silentRequest);
        
        if (response && response.accessToken) {
            console.log('Successfully acquired access token');
            return response.accessToken;
        }
        
        console.warn('No access token in response');
        return null;
    } catch (error) {
        console.error('Failed to acquire token silently:', error);
        
        // If silent token acquisition fails, try to get a token interactively
        if (error instanceof InteractionRequiredAuthError) {
            try {
                console.log('Interactive token acquisition required');
                const response = await msalInstance.acquireTokenPopup({
                    scopes: ['User.Read']
                });
                return response?.accessToken || null;
            } catch (popupError) {
                console.error('Interactive token acquisition failed:', popupError);
            }
        }
        
        return null;
    }
};
// Check if authentication is required
const isAuthRequired = async () => {
    // If we're in production, always require auth unless explicitly disabled
    if (!import.meta.env.DEV) {
        return true;
    }

    // In development, check the auth status endpoint
    try {
        // Use a timeout to prevent hanging if the server is not available
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1000); // 1 second timeout
        
        const response = await fetch('/api/auth/status', {
            signal: controller.signal
        }).finally(() => clearTimeout(timeoutId));
        
        if (!response.ok) {
            console.warn('Auth status check failed, defaulting to no auth');
            return false;
        }
        
        const data = await response.json();
        return data.authRequired !== false;
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.warn('Auth status check failed:', error.message);
        } else {
            console.warn('Auth status check timed out, defaulting to no auth');
        }
        return false; // Default to no auth if we can't check
    }
};

export const authFetch = async (url, options = {}) => {
    const headers = new Headers(options.headers);
    
    // Only set Content-Type to application/json if it's not a FormData object
    // and Content-Type is not already set
    if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
        headers.append('Content-Type', 'application/json');
    }
    
    // Only add auth header if authentication is required
    const authRequired = await isAuthRequired();
    if (authRequired) {
        try {
            const token = await getAuthToken();
            if (token) {
                headers.set('Authorization', `Bearer ${token}`);
            } else if (import.meta.env.DEV) {
                console.warn('No auth token available, but auth is required. Using mock token for development.');
                const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkRldiBVc2VyIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
                headers.set('Authorization', `Bearer ${mockToken}`);
            } else {
                throw new Error('Authentication required but no token available');
            }
        } catch (error) {
            console.error('Error during authentication:', error);
            // In development, continue without auth to avoid breaking the dev experience
            if (!import.meta.env.DEV) {
                throw error;
            }
            console.warn('Continuing without authentication in development mode');
        }
    } else {
        console.log('Authentication not required, skipping token check');
    }
    
    // Ensure we don't have double slashes in the URL
    const cleanUrl = url.startsWith('/') ? url : `/${url}`;
    let requestUrl = '';
    
    // In development, use the full URL with the proxy
    if (isDev) {
        requestUrl = cleanUrl;
    } else {
        // In production, use the base URL from environment variables
        requestUrl = `${API_BASE_URL}${cleanUrl}`;
    }
    
    try {
        const response = await fetch(requestUrl, {
            ...options,
            headers,
            credentials: 'include' // Important for cookies/auth
        });
        
        // Check if response is JSON before trying to parse it
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Request failed');
            }
            return data;
        } else if (!response.ok) {
            const text = await response.text();
            throw new Error(`Request failed with status ${response.status}: ${text}`);
        }
        
        return response;
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
};
// Configuration for different environments
const isDev = import.meta.env.DEV;
// In production, use the VITE_API_BASE_URL if it's set, otherwise use an empty string
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';


export const api = {
    get: (endpoint, options = {}) => authFetch(endpoint, { ...options, method: 'GET' }),
    post: (endpoint, data, options = {}) => {
        // If data is FormData, don't stringify it
        const isFormData = data instanceof FormData;
        return authFetch(endpoint, {
            ...options,
            method: 'POST',
            body: isFormData ? data : (data ? JSON.stringify(data) : undefined),
        });
    },
    put: (endpoint, data, options = {}) => authFetch(endpoint, {
        ...options,
        method: 'PUT',
        body: data ? JSON.stringify(data) : undefined,
    }),
    delete: (endpoint, options = {}) => authFetch(endpoint, {
        ...options,
        method: 'DELETE'
    }),
};
