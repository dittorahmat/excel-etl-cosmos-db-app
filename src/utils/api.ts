import { msalInstance } from '../auth/msalInstance';

// Extended Response type with generic JSON body
type ApiResponse<T = unknown> = Response & {
  json(): Promise<T>;
};

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

export const authFetch = async <T = unknown>(url: string, options: RequestInit = {}): Promise<ApiResponse<T>> => {
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
  get: <T = unknown>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> => 
    authFetch<T>(`${API_BASE_URL}${endpoint}`, { ...options, method: 'GET' }),
  
  post: <T = unknown, D = unknown>(
    endpoint: string, 
    data?: D, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> =>
    authFetch<T>(`${API_BASE_URL}${endpoint}`, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T = unknown, D = unknown>(
    endpoint: string, 
    data?: D, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> =>
    authFetch<T>(`${API_BASE_URL}${endpoint}`, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T = unknown>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> =>
    authFetch<T>(`${API_BASE_URL}${endpoint}`, { 
      ...options, 
      method: 'DELETE' 
    }),
};
