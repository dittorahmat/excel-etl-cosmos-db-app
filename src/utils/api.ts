import { msalInstance } from '../auth/msalInstance';
import { InteractionRequiredAuthError, AccountInfo } from '@azure/msal-browser';

// Interface for error response data
interface ErrorResponseData {
  message?: string;
  [key: string]: unknown;
}

// Rate limiting configuration
const _RATE_LIMIT_RETRY_ATTEMPTS = import.meta.env.DEV ? 0 : 3;

// Token cache to store tokens in memory
let tokenCache: { [key: string]: { token: string | null; expiresAt: number } } = {};
const TOKEN_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Track rate limits per endpoint
const rateLimitState: { [key: string]: { lastRequest: number; retryAfter: number } } = {};

const getCacheKey = (account: AccountInfo): string => {
  return `${account.homeAccountId}-${account.tenantId}`;
};

export const getAuthToken = async (forceRefresh = false): Promise<string | null> => {
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
    
    const account = accounts[0];
    const cacheKey = getCacheKey(account);
    const now = Date.now();
    
    // Return cached token if it exists and is still valid
    if (!forceRefresh && tokenCache[cacheKey] && tokenCache[cacheKey].expiresAt > now) {
      console.log('Using cached token');
      return tokenCache[cacheKey].token;
    }
    
    const silentRequest = {
      scopes: ['User.Read'],
      account,
      forceRefresh
    };
    
    console.log(forceRefresh ? 'Force refreshing token...' : 'Acquiring token silently...');
    const response = await msalInstance.acquireTokenSilent(silentRequest);
    
    if (response?.accessToken) {
      console.log('Successfully acquired access token');
      // Cache the token
      tokenCache[cacheKey] = {
        token: response.accessToken,
        expiresAt: now + TOKEN_CACHE_TTL
      };
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
        
        if (response?.accessToken) {
          const accounts = msalInstance.getAllAccounts();
          if (accounts.length > 0) {
            const cacheKey = getCacheKey(accounts[0]);
            tokenCache[cacheKey] = {
              token: response.accessToken,
              expiresAt: Date.now() + TOKEN_CACHE_TTL
            };
          }
          return response.accessToken;
        }
      } catch (popupError) {
        console.error('Interactive token acquisition failed:', popupError);
      }
    }
    
    return null;
  }
};

type RequestBody = BodyInit | Record<string, unknown> | null | undefined;

interface RequestOptions extends Omit<RequestInit, 'headers' | 'body' | 'onUploadProgress'> {
  headers?: HeadersInit & {
    'Content-Type'?: string;
    [key: string]: string | string[] | undefined;
  };
  body?: RequestBody;
  onUploadProgress?: (progressEvent: ProgressEvent<EventTarget> & { 
    lengthComputable: boolean; 
    loaded: number; 
    total: number;
  }) => void;
}

const prepareBody = (body: RequestBody): BodyInit | null | undefined => {
  if (body === null || body === undefined) return body;
  if (typeof body === 'string' || body instanceof Blob || body instanceof FormData || 
      body instanceof URLSearchParams || ArrayBuffer.isView(body)) {
    return body as BodyInit;
  }
  return JSON.stringify(body);
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const authFetch = async <T = unknown>(
  url: string, 
  options: RequestOptions = {},
  attempt = 1
): Promise<T> => {
  const headers = new Headers(options.headers);
  
  // Get base URL from environment and ensure it doesn't end with a slash
  const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001').replace(/\/+$/, '');
  
  // Clean the URL path by removing leading/trailing slashes
  const cleanPath = url.replace(/^\/+|\/+$/g, '');
  
  // Construct the full URL, ensuring we don't have double /api
  let fullUrl;
  if (cleanPath.startsWith('http')) {
    // If it's a full URL, use it as is
    fullUrl = cleanPath;
  } else {
    // Remove any existing /api/ from the path to prevent duplication
    const normalizedPath = cleanPath.replace(/^\/api\//, '').replace(/^api\//, '');
    
    // Check if the base URL already includes /api
    const baseHasApi = baseUrl.endsWith('/api') || baseUrl.includes('/api/');
    
    if (baseHasApi) {
      fullUrl = `${baseUrl}/${normalizedPath}`;
    } else {
      fullUrl = `${baseUrl}/api/${normalizedPath}`;
    }
    
    // Ensure we don't have double slashes
    fullUrl = fullUrl.replace(/([^:])\/\//g, '$1/');
  }
  
  // For development, use the full URL to ensure proper routing through the dev server
  const requestUrl = import.meta.env.DEV ? fullUrl : fullUrl;

  // Check rate limiting for this endpoint
  const endpoint = new URL(url, import.meta.env.VITE_API_BASE_URL || '').pathname;
  const now = Date.now();
  const rateLimit = rateLimitState[endpoint];
  
  if (rateLimit && now < rateLimit.lastRequest + rateLimit.retryAfter) {
    const waitTime = rateLimit.lastRequest + rateLimit.retryAfter - now;
    console.log(`Rate limited on ${endpoint}, waiting ${waitTime}ms before retry`);
    await sleep(waitTime);
  }

  // Only set Content-Type to application/json if it's not a FormData object
  // and Content-Type is not already set
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.append('Content-Type', 'application/json');
  }
  
  // Check if authentication is required (only on first attempt to avoid extra requests)
  if (attempt === 1) {
    try {
      const authStatusResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/auth/status`);
      if (authStatusResponse.ok) {
        const authStatus = await authStatusResponse.json();
        const authRequired = authStatus.authRequired !== false;
        
        if (authRequired) {
          const token = await getAuthToken();
          if (token) {
            headers.set('Authorization', `Bearer ${token}`);
          } else if (import.meta.env.DEV) {
            console.log('Using development mock token');
            const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkRldiBVc2VyIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
            headers.set('Authorization', `Bearer ${mockToken}`);
          } else {
            throw new Error('Authentication required but no valid token available');
          }
        }
      }
    } catch (error) {
      console.error('Error checking authentication status:', error);
      // If we can't check the auth status, assume authentication is required
      console.warn('Could not determine if authentication is required, proceeding without token');
    }
  }
  
  // If it's a file upload with progress tracking
  const { onUploadProgress, ..._fetchOptions } = options;
  
  if (onUploadProgress) {
    if (!(options.body instanceof FormData)) {
      throw new Error('onUploadProgress is only supported with FormData');
    }

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.open(options.method || 'POST', requestUrl, true);
      
      // Set headers
      const _xhrHeaders = new Headers(options.headers as HeadersInit);
      if (token) {
        _xhrHeaders.set('Authorization', `Bearer ${token}`);
      }
      
      // Progress event handling
      xhr.upload.onprogress = (event: ProgressEvent<EventTarget> & { 
        lengthComputable: boolean; 
        loaded: number; 
        total: number;
      }) => {
        if (options.onUploadProgress) {
          options.onUploadProgress(event);
        }
      };
      
      xhr.onload = () => {
        const responseText = xhr.responseText;
        const contentType = xhr.getResponseHeader('Content-Type') || 'application/json';

        if (!xhr.status.toString().startsWith('2')) {
          let errorData: ErrorResponseData = { message: xhr.statusText };
          try {
            const jsonData = JSON.parse(responseText);
            if (typeof jsonData === 'object' && jsonData !== null) {
              errorData = { ...jsonData };
            }
          } catch (e) {
            console.debug('Error parsing error response:', e);
          }

          const error = new Error(errorData.message || 'Request failed');
          (error as { status?: number }).status = xhr.status;
          (error as { response?: ErrorResponseData }).response = errorData;
          reject(error);
        } else {
          try {
            if (responseText && contentType.includes('application/json')) {
              resolve(JSON.parse(responseText));
            } else {
              resolve({} as T); // Resolve with empty object for non-JSON success
            }
          } catch (error) {
            console.error('Error parsing JSON response:', error);
            reject(new Error('Invalid JSON response'));
          }
        }
      };
      
      xhr.onerror = () => {
        reject(new Error('Network error'));
      };
      
      xhr.send(options.body as XMLHttpRequestBodyInit);
    });
  }

  // Regular fetch for non-upload requests with retry logic
  for (let i = 0; i <= _RATE_LIMIT_RETRY_ATTEMPTS; i++) {
    // This will be set to true if we should attempt a retry
    let shouldRetry = false;
    try {
      const body = prepareBody(options.body);
      const token = await getAuthToken();
      
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          ...options.headers,
        },
        body: body as BodyInit
      });
      
      if (!response.ok) {
        // Handle rate limiting
        if (response.status === 429 || response.status === 503) {
          const retryAfter = response.headers.get('Retry-After');
          const baseDelay = 1000; // 1 second base delay
          const maxDelay = 10000; // 10 seconds max delay
          const retryDelay = retryAfter 
            ? parseInt(retryAfter, 10) * 1000 
            : baseDelay * Math.pow(2, i);

          if (i < _RATE_LIMIT_RETRY_ATTEMPTS) {
            await sleep(Math.min(retryDelay, maxDelay));
            shouldRetry = true;
            break; // Break out of the try block to retry
          }
        }

        let errorData: ErrorResponseData = { message: response.statusText };
        try {
          const jsonData = await response.json();
          if (typeof jsonData === 'object' && jsonData !== null) {
            errorData = { ...jsonData };
          }
        } catch (e) {
          console.debug('Error parsing error response:', e);
        }

        const error = new Error(errorData.message || 'Request failed');
        (error as { status?: number }).status = response.status;
        (error as { response?: ErrorResponseData }).response = errorData;
        throw error;
      }
      
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        return {} as T; // Return empty object for successful non-JSON responses
      }
    } catch (error) {
      // Only log and retry if this wasn't a rate limit error we already handled
      if (!shouldRetry) {
        console.error('API request failed:', error);
        if (i === _RATE_LIMIT_RETRY_ATTEMPTS) {
          throw error;
        }
        // Wait before retrying
        await sleep(1000 * (i + 1));
      }
    }
  }
  
  // This should never be reached because we throw an error when max retries are exceeded
  // But TypeScript needs a return statement here
  throw new Error(`Request failed after ${_RATE_LIMIT_RETRY_ATTEMPTS + 1} attempts.`);
};

interface ApiClient {
  get: <T = unknown>(endpoint: string, options?: Omit<RequestOptions, 'body' | 'method'>) => Promise<T>;
  post: <T = unknown, D = unknown>(
    endpoint: string, 
    data?: D, 
    options?: Omit<RequestOptions, 'body' | 'method'>
  ) => Promise<T>;
  put: <T = unknown, D = unknown>(
    endpoint: string, 
    data?: D, 
    options?: Omit<RequestOptions, 'body' | 'method'>
  ) => Promise<T>;
  delete: <T = unknown>(
    endpoint: string, 
    options?: Omit<RequestOptions, 'body' | 'method'>
  ) => Promise<T>;
}

// Clear token cache on page unload to ensure fresh tokens on next load
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    tokenCache = {};
  });
}

export const api: ApiClient = {
  get: <T = unknown>(endpoint: string, options: Omit<RequestOptions, 'body' | 'method'> = {}) => 
    authFetch<T>(endpoint, { ...options, method: 'GET' }),
    
  post: <T = unknown, D = unknown>(
    endpoint: string, 
    data?: D, 
    options: Omit<RequestOptions, 'body' | 'method'> = {}
  ) => {
    const isFormData = data instanceof FormData;
    const body = isFormData ? data as FormData : (data ? JSON.stringify(data) : undefined);
    return authFetch<T>(endpoint, {
      ...options,
      method: 'POST',
      body,
    });
  },
  
  put: <T = unknown, D = unknown>(
    endpoint: string, 
    data?: D, 
    options: Omit<RequestOptions, 'body' | 'method'> = {}
  ) => {
    const body = data ? JSON.stringify(data) : undefined;
    return authFetch<T>(endpoint, {
      ...options,
      method: 'PUT',
      body,
    });
  },
    
  delete: <T = unknown>(
    endpoint: string, 
    options: Omit<RequestOptions, 'body' | 'method'> = {}
  ) => 
    authFetch<T>(endpoint, {
      ...options,
      method: 'DELETE',
    }),
};
