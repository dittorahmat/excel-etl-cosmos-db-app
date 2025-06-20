import { msalInstance } from '../auth/AuthProvider';

export const getAuthToken = async (): Promise<string | null> => {
  try {
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length === 0) return null;

    const silentRequest = {
      scopes: ['User.Read'],
      account: accounts[0],
    };

    const response = await msalInstance.acquireTokenSilent(silentRequest);
    return response.accessToken;
  } catch (error) {
    console.error('Failed to acquire token silently', error);
    return null;
  }
};

export const authFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const token = await getAuthToken();
  
  const headers = new Headers(options.headers);
  if (token) {
    headers.append('Authorization', `Bearer ${token}`);
  }
  headers.append('Content-Type', 'application/json');

  return fetch(url, {
    ...options,
    headers,
  });
};

// Get the base URL from Vite environment variables
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export const api = {
  get: (endpoint: string, options: RequestInit = {}) => 
    authFetch(`${API_BASE_URL}${endpoint}`, { ...options, method: 'GET' }),
  
  post: (endpoint: string, data?: any, options: RequestInit = {}) =>
    authFetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: (endpoint: string, data?: any, options: RequestInit = {}) =>
    authFetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: (endpoint: string, options: RequestInit = {}) =>
    authFetch(`${API_BASE_URL}${endpoint}`, { ...options, method: 'DELETE' }),
};
