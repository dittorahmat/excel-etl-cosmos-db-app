import { msalInstance } from '../auth/msalInstance';
export const getAuthToken = async () => {
    try {
        const accounts = msalInstance.getAllAccounts();
        if (accounts.length === 0)
            return null;
        const silentRequest = {
            scopes: ['User.Read'],
            account: accounts[0],
        };
        const response = await msalInstance.acquireTokenSilent(silentRequest);
        return response.accessToken;
    }
    catch (error) {
        console.error('Failed to acquire token silently', error);
        return null;
    }
};
export const authFetch = async (url, options = {}) => {
    const token = await getAuthToken();
    const headers = new Headers(options.headers);
    
    // Only set Content-Type to application/json if it's not a FormData object
    // and Content-Type is not already set
    if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
        headers.append('Content-Type', 'application/json');
    }
    
    // In development, use mock API key if no token is available
     if (token) {
        // In production or if we have a token, use it
        headers.append('Authorization', `Bearer ${token}`);
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
