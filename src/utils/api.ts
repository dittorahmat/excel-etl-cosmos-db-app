import { 
  type AccountInfo, 
  InteractionRequiredAuthError,
  LogLevel
} from '@azure/msal-browser';
import { msalConfig, getApiConfig } from '../auth/authConfig';
import { msalInstance } from '../auth/msalInstance';

// Check if authentication is enabled
const isDevelopment = import.meta.env.DEV;
const windowEnvViteAuthEnabled = window.ENV?.VITE_AUTH_ENABLED || (window as any).__APP_CONFIG__?.VITE_AUTH_ENABLED;
const authEnabled = import.meta.env.VITE_AUTH_ENABLED !== 'false' && 
                   windowEnvViteAuthEnabled !== 'false' && 
                   windowEnvViteAuthEnabled !== false;
                   
const useDummyAuth = !authEnabled || isDevelopment || 
                     window.USE_DUMMY_AUTH === true || 
                     window.FORCE_DUMMY_AUTH === true || 
                     windowEnvViteAuthEnabled === 'false' || 
                     windowEnvViteAuthEnabled === false;

let msalInitialized = false;

const initializeMsal = async () => {
  // Skip initialization if using dummy auth
  if (useDummyAuth) {
    console.log('[API] Using dummy auth, skipping MSAL initialization');
    return;
  }
  
  if (!msalInitialized) {
    await msalInstance.initialize();
    msalInitialized = true;
  }
};

// Interface for error response data
interface ErrorResponseData {
  message?: string;
  [key: string]: unknown;
}

// Get API base URL from environment variables with fallback
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// Rate limiting configuration
const _RATE_LIMIT_RETRY_ATTEMPTS = import.meta.env.DEV ? 0 : 3;

// Token cache to store tokens in memory
const tokenCache: Record<string, { token: string; expiresAt: number }> = {};
const TOKEN_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Track rate limits per endpoint
const rateLimitState: { [key: string]: { lastRequest: number; retryAfter: number } } = {};

const getCacheKey = (account: AccountInfo): string => {
  return `${account.homeAccountId}-${account.tenantId}`;
};

export const getAuthToken = async (forceRefresh = false): Promise<string | null> => {
  // If auth is disabled, return null immediately
  const windowEnvViteAuthEnabled = window.ENV?.VITE_AUTH_ENABLED || (window as any).__APP_CONFIG__?.VITE_AUTH_ENABLED;
  const isAuthEnabled = import.meta.env.VITE_AUTH_ENABLED !== 'false' && 
                       windowEnvViteAuthEnabled !== 'false' && 
                       windowEnvViteAuthEnabled !== false;
                       
  if (!isAuthEnabled) {
    console.log('[API] Authentication is disabled, returning null token');
    return null;
  }
  
  // If using dummy auth, return a mock token
  const useDummyAuth = !isAuthEnabled || isDevelopment || 
                       window.USE_DUMMY_AUTH === true || 
                       window.FORCE_DUMMY_AUTH === true || 
                       windowEnvViteAuthEnabled === 'false' || 
                       windowEnvViteAuthEnabled === false;
                       
  if (useDummyAuth) {
    console.log('[API] Using dummy authentication, returning mock token');
    // Return a mock token for development
    return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkRldiBVc2VyIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
  }
  
  await initializeMsal();
  try {
    // In development, return a mock token
    if (import.meta.env.DEV) {
      console.log('Using development mock token');
      return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkRldiBVc2VyIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    }

    // Get the real token in production
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length === 0) {
      console.log('No accounts found');
      // Try to initiate login if no accounts found
      try {
        await msalInstance.loginRedirect({
          scopes: getApiConfig().scopes
        });
      } catch (error) {
        console.error('Login failed:', error);
      }
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
      scopes: getApiConfig().scopes,
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
        const accounts = msalInstance.getAllAccounts();
        if (accounts.length === 0) {
          console.warn('No accounts available for interactive token acquisition');
          return null;
        }
        
        const authResult = await msalInstance.acquireTokenPopup({
          scopes: getApiConfig().scopes,
          account: accounts[0],
        });
        
        if (authResult?.accessToken) {
          // Cache the new token
          const cacheKey = getCacheKey(accounts[0]);
          tokenCache[cacheKey] = {
            token: authResult.accessToken,
            expiresAt: Date.now() + TOKEN_CACHE_TTL,
          };
          return authResult.accessToken;
        }
        return null;
      } catch (popupError) {
        console.error('Error acquiring token interactively:', popupError);
        return null;
      }
    }
    
    return null;
  }
};

// Extend MSAL Browser types to include our logger options
declare module '@azure/msal-browser' {
  interface LoggerOptions {
    logLevel: LogLevel;
    loggerCallback: (level: LogLevel, message: string, containsPii: boolean) => void;
  }
}

interface RequestOptions extends Omit<RequestInit, 'headers' | 'body'> {
  headers?: HeadersInit | Record<string, string | string[] | undefined> & {
    'Content-Type'?: string;
  };
  body?: BodyInit | Record<string, unknown> | null;
  onUploadProgress?: (progressEvent: ProgressEvent<EventTarget> & { 
    lengthComputable: boolean; 
    loaded: number; 
    total: number;
  }) => void;
}

// Helper function to safely convert a value to a string for headers
const safeStringify = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return value.toString();
  try {
    return JSON.stringify(value);
  } catch (e) {
    console.error('Error stringifying header value:', e);
    return '';
  }
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));


export const authFetch = async <T = unknown>(
  url: string, 
  options: RequestOptions = {}
): Promise<T> => {
  // Initialize headers
  const headers = new Headers();
  
  // Process headers from options
  if (options.headers) {
    if (Array.isArray(options.headers)) {
      options.headers.forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach(v => headers.append(key, v));
        } else if (value !== undefined) {
          headers.append(key, value);
        }
      });
    } else if (options.headers instanceof Headers) {
      options.headers.forEach((value, key) => {
        if (value !== null) {
          headers.append(key, value);
        }
      });
    } else {
      Object.entries(options.headers).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach(v => headers.append(key, safeStringify(v)));
        } else if (value !== undefined) {
          headers.append(key, safeStringify(value));
        }
      });
    }
  }
  
  // Process request body
  let body: BodyInit | undefined;
  if (options.body) {
    if (
      options.body instanceof FormData ||
      options.body instanceof Blob ||
      options.body instanceof URLSearchParams ||
      ArrayBuffer.isView(options.body)
    ) {
      body = options.body;
    } else if (typeof options.body === 'object' && options.body !== null) {
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
      body = JSON.stringify(options.body);
    } else if (typeof options.body === 'string') {
      body = options.body;
    }
  }
  
  // Get base URL from environment and ensure it doesn't end with a slash
  // In production, we're using the same server for both frontend and backend
  const isProd = import.meta.env.PROD === true;
  const baseUrl = isProd 
    ? '' 
    : (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001');
    
  // Clean the URL path by removing leading/trailing slashes
  const cleanPath = url.replace(/^\/+|\/+$/g, '');
  
  // Construct the full URL
  let fullUrl: string;
  if (cleanPath.startsWith('http')) {
    // If it's a full URL, use it as is
    fullUrl = cleanPath;
  } else {
    // For relative paths, construct the URL properly
    if (!isProd) {
      // Development mode with separate backend - ensure all API calls go through /api
      if (cleanPath.startsWith('api/')) {
        fullUrl = `${baseUrl}/${cleanPath}`;
      } else {
        fullUrl = `${baseUrl}/api/${cleanPath}`;
      }
      fullUrl = fullUrl.replace(/([^:])\/+/g, '$1/');
    } else {
      // Production mode with unified server
      // For API calls, ensure they start with /api
      if (cleanPath.startsWith('api/')) {
        fullUrl = `/${cleanPath}`;
      } else {
        fullUrl = `/api/${cleanPath}`;
      }
    }
  }
  
  // Use the constructed URL directly
  const requestUrl = fullUrl;
  
  // Check rate limiting for this endpoint
  const endpoint = new URL(url, import.meta.env.VITE_API_BASE_URL || window.location.origin).pathname;
  const now = Date.now();
  const rateLimit = rateLimitState[endpoint];
  
  if (rateLimit && now < rateLimit.lastRequest + rateLimit.retryAfter) {
    const waitTime = rateLimit.lastRequest + rateLimit.retryAfter - now;
    console.log(`Rate limited on ${endpoint}, waiting ${waitTime}ms before retry`);
    await sleep(waitTime);
  }

  // Only try to get a token if auth is explicitly enabled
  const isAuthEnabled = import.meta.env.VITE_AUTH_ENABLED !== 'false';
  if (isAuthEnabled) {
    try {
      const token = await getAuthToken();
      if (token) {
        headers.append('Authorization', `Bearer ${token}`);
        console.log('[API] Authorization header set with token');
      } else {
        console.warn('[API] No token available for request');
      }
    } catch (error) {
      console.error('Error getting auth token for request:', error);
    }
  } else {
    console.log('[API] Authentication is disabled, skipping token acquisition');
  }

  // Convert headers to a format that fetch can use
  const fetchHeaders: Record<string, string> = {};
  headers.forEach((value, key) => {
    if (value !== undefined && value !== null) {
      fetchHeaders[key] = String(value);
    }
  });

  // Handle file upload with progress tracking
  const { onUploadProgress } = options;
  if (onUploadProgress) {
    if (!(options.body instanceof FormData)) {
      throw new Error('onUploadProgress is only supported with FormData');
    }

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(options.method || 'POST', requestUrl, true);
      
      // Set all headers
      Object.entries(fetchHeaders).forEach(([key, value]) => {
        if (value) {
          xhr.setRequestHeader(key, String(value));
        }
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
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= _RATE_LIMIT_RETRY_ATTEMPTS; attempt++) {
    try {
      console.log(`[API] Making request to ${requestUrl} (attempt ${attempt + 1}/${_RATE_LIMIT_RETRY_ATTEMPTS + 1})`);
      
      // Create a properly typed RequestInit object
      const fetchOptions: RequestInit = {
        method: options.method || 'GET',
        credentials: 'include',
        headers: fetchHeaders,
      };
      
      // Set the body if it exists
      if (body !== undefined && body !== null) {
        fetchOptions.body = body;
        // Set Content-Type header if not already set and body is an object
        if (
          typeof options.body === 'object' && 
          options.body !== null &&
          !(options.body instanceof Blob) &&
          !(options.body instanceof FormData) &&
          !(options.body instanceof URLSearchParams) &&
          !ArrayBuffer.isView(options.body)
        ) {
          fetchHeaders['Content-Type'] = 'application/json';
        }
      }
      
      const response = await fetch(requestUrl, fetchOptions);
      
      console.log(`[API] [${new Date().toISOString()}] Response status:`, response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Failed to read error response');
        console.error(`[API] Request failed with status: ${response.status} ${response.statusText}`, errorText);
        
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
            continue; // Retry the request
          }
        }
        
        // If we get here, we've exceeded retry attempts or it's not a rate limit error
        lastError = new Error(`Request failed with status ${response.status}: ${response.statusText}`);
        continue;
      }
      
      // Request was successful, parse and return the response
      try {
        const data = await response.json();
        return data as T;
      } catch (parseError) {
        console.error('[API] Error parsing JSON response:', parseError);
        lastError = new Error('Failed to parse server response');
        continue;
      }
    } catch (error) {
      console.error('[API] Network error:', error);
      lastError = error as Error;
      
      // Only retry on network errors, not on other types of errors
      if (attempt < _RATE_LIMIT_RETRY_ATTEMPTS) {
        const delay = 1000 * Math.pow(2, attempt); // Exponential backoff
        console.log(`[API] Retrying in ${delay}ms... (attempt ${attempt + 1}/${_RATE_LIMIT_RETRY_ATTEMPTS})`);
        await sleep(delay);
        continue;
      }
    }
  }
  
  // If we get here, all retry attempts failed
  throw lastError || new Error('Request failed after all retry attempts');
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
    // Clear the token cache by removing all entries
    Object.keys(tokenCache).forEach(key => delete tokenCache[key]);
  });
}

export const api: ApiClient = {
  get: <T = unknown>(
    endpoint: string, 
    options: Omit<RequestOptions, 'body' | 'method'> = {}
  ): Promise<T> => {
    return authFetch<T>(endpoint, {
      ...options,
      method: 'GET',
    });
  },  
  post: <T = unknown, D = unknown>(
    endpoint: string, 
    data?: D, 
    options: Omit<RequestOptions, 'body' | 'method'> = {}
  ): Promise<T> => {
    const isFormData = data instanceof FormData;
    const body = isFormData ? data : (data ? JSON.stringify(data) : undefined);
    
    // Create new headers object that matches the expected type
    const headers: Record<string, string> = {};
    
    // Copy existing headers if any
    if (options.headers) {
      if (options.headers instanceof Headers) {
        options.headers.forEach((value, key) => {
          headers[key] = value;
        });
      } else if (Array.isArray(options.headers)) {
        options.headers.forEach(([key, value]) => {
          if (Array.isArray(value)) {
            headers[key] = value.join(',');
          } else if (value) {
            headers[key] = value;
          }
        });
      } else {
        Object.entries(options.headers).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            headers[key] = value.join(',');
          } else if (value) {
            headers[key] = value;
          }
        });
      }
    }

    // Set Content-Type header if not already set and not FormData
    if (!isFormData && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    // For FormData, let the browser set the content type with the boundary
    if (body instanceof FormData) {
      // Remove any existing content-type header to let the browser set it with the boundary
      const { 'content-type': _unusedContentType, ...headersWithoutContentType } = headers;
      return authFetch<T>(endpoint, {
        ...options,
        headers: headersWithoutContentType as HeadersInit,
        method: 'POST',
        body,
      });
    }

    return authFetch<T>(endpoint, {
      ...options,
      headers: headers as HeadersInit,
      method: 'POST',
      body,
    });
  },
  
  put: <T = unknown, D = unknown>(
    endpoint: string, 
    data?: D, 
    options: Omit<RequestOptions, 'body' | 'method'> = {}
  ): Promise<T> => {
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
  ): Promise<T> => {
    return authFetch<T>(endpoint, {
      ...options,
      method: 'DELETE',
    });
  },
};
