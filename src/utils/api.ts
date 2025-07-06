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
  
  // Skip authentication in development if AUTH_ENABLED is explicitly set to false in the environment
  if (import.meta.env.VITE_AUTH_ENABLED === 'false') {
    console.log('Authentication disabled in development mode');
  } 
  // Check if authentication is required (only on first attempt to avoid extra requests)
  else if (attempt === 1 && import.meta.env.VITE_AUTH_ENABLED !== 'false') {
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
  
  // Get authentication token if needed
  let authToken = headers.get('Authorization');
  if (!authToken) {
    try {
      const token = await getAuthToken();
      if (token) {
        authToken = `Bearer ${token}`;
      } else if (import.meta.env.DEV) {
        console.log('Using development mock token for XHR');
        const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkRldiBVc2VyIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
        authToken = `Bearer ${mockToken}`;
      }
    } catch (error) {
      console.error('Error getting auth token for XHR:', error);
    }
  }

  // If it's a file upload with progress tracking
  const { onUploadProgress } = options;
  
  if (onUploadProgress) {
    if (!(options.body instanceof FormData)) {
      throw new Error('onUploadProgress is only supported with FormData');
    }

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.open(options.method || 'POST', requestUrl, true);
      
      // Set headers
      const _xhrHeaders = new Headers(options.headers as HeadersInit);
      if (authToken) {
        _xhrHeaders.set('Authorization', authToken);
      }
      
      // Set all headers
      _xhrHeaders.forEach((value, key) => {
        xhr.setRequestHeader(key, value);
      });
      
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

        // Create a mock Response object that matches the Fetch API Response interface
        const response = {
          ok: xhr.status >= 200 && xhr.status < 300,
          status: xhr.status,
          statusText: xhr.statusText,
          headers: {
            get: (name: string) => xhr.getResponseHeader(name)
          },
          json: () => Promise.resolve(JSON.parse(responseText)),
          text: () => Promise.resolve(responseText),
          clone: function() { return { ...this }; },
          type: 'basic' as const,
          url: requestUrl,
          redirected: false,
          body: null,
          bodyUsed: false,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
          blob: () => Promise.resolve(new Blob()),
          formData: () => Promise.resolve(new FormData())
        };

        if (!response.ok) {
          let errorData: ErrorResponseData = { message: xhr.statusText };
          try {
            const jsonData = JSON.parse(responseText);
            if (typeof jsonData === 'object' && jsonData !== null) {
              errorData = { ...jsonData };
            }
          } catch (error) {
            console.error('Error parsing error response:', error);
          }
          reject(new Error(errorData.message || 'Request failed'));
          return;
        }

        try {
          const data = responseText ? JSON.parse(responseText) : null;
          console.log('[API] XHR Response data:', data);
          resolve(data as unknown as T);
        } catch (e) {
          console.error('[API] Error parsing XHR JSON response:', e);
          resolve(null as unknown as T);
        }
      };
      
      xhr.onerror = () => {
        reject(new Error('Network error occurred'));
      };
      
      xhr.send(options.body as XMLHttpRequestBodyInit);
    });
  }

  // Regular fetch for non-upload requests with retry logic
  for (let attempt = 0; attempt <= _RATE_LIMIT_RETRY_ATTEMPTS; attempt++) {
    let shouldRetry = false;
    try {
      const requestBody = prepareBody(options.body);
      
      console.log(`[API] [${new Date().toISOString()}] Making ${options.method || 'GET'} request to:`, requestUrl);
      console.log('[API] Request headers:', {
        'Content-Type': 'application/json',
        ...(authToken ? { 'Authorization': 'Bearer [REDACTED]' } : {}),
        ...Object.fromEntries(headers.entries()),
      });
      
      if (options.body) {
        console.log('[API] Request body:', options.body);
      }
      
      const response = await fetch(requestUrl, {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { 'Authorization': authToken } : {}),
          ...Object.fromEntries(headers.entries()),
        },
        body: requestBody as BodyInit
      });
      
      console.log(`[API] [${new Date().toISOString()}] Response status:`, response.status, response.statusText);
      
      if (!response.ok) {
        console.error(`[API] Request failed with status: ${response.status} ${response.statusText}`);
        const errorText = await response.text().catch(() => 'Failed to read error response');
        console.error('[API] Error response body:', errorText);
        
        // Handle rate limiting
        if (response.status === 429 || response.status === 503) {
          const retryAfter = response.headers.get('Retry-After');
          const baseDelay = 1000; // 1 second base delay
          const maxDelay = 10000; // 10 seconds max delay
          const retryDelay = retryAfter 
            ? parseInt(retryAfter, 10) * 1000 
            : baseDelay * Math.pow(2, attempt);

          if (attempt < _RATE_LIMIT_RETRY_ATTEMPTS) {
            const delay = Math.min(retryDelay, maxDelay);
            console.log(`[API] Rate limited. Retrying in ${delay}ms... (attempt ${attempt + 1}/${_RATE_LIMIT_RETRY_ATTEMPTS})`);
            await sleep(delay);
            shouldRetry = true;
            continue; // Retry the request
          }
        }
        
        // If we get here, we've exceeded retry attempts
        throw new Error('Max retry attempts exceeded');
      }
      
      // Request was successful, parse and return the response
      try {
        const data = await response.json();
        console.log('[API] Response data:', data);
        return data as T;
      } catch (e) {
        console.error('[API] Error parsing JSON response:', e);
        return null as unknown as T;
      }
      
    } catch (error: unknown) {
      console.error('[API] Request error:', error);
      if (!shouldRetry || attempt >= _RATE_LIMIT_RETRY_ATTEMPTS) {
        // Handle different types of errors
        if (error instanceof Error) {
          throw error;
        } else if (error && typeof error === 'object' && 'status' in error && 'statusText' in error) {
          // Handle Response-like objects
          const response = error as { status: number; statusText: string };
          throw new Error(`Request failed with status ${response.status}: ${response.statusText}`);
        } else {
          throw new Error('An unknown error occurred');
        }
      }
      // If we should retry, the loop will continue
    }
  }
  
  // If we've exhausted all retry attempts without returning or throwing
  throw new Error('Request failed after all retry attempts');
}

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
