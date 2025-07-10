import { 
  type AccountInfo, 
  PublicClientApplication, 
  InteractionRequiredAuthError,
  LogLevel
} from '@azure/msal-browser';
import { msalConfig } from '../auth/authConfig';

// Initialize MSAL instance with proper typing
const msalInstance = new PublicClientApplication({
  ...msalConfig,
  system: {
    ...msalConfig.system,
    loggerOptions: {
      ...msalConfig.system?.loggerOptions,
      logLevel: import.meta.env.DEV ? LogLevel.Info : LogLevel.Error,
    },
  },
});

// Interface for error response data
interface ErrorResponseData {
  message?: string;
  [key: string]: unknown;
}

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
          scopes: ['User.Read']
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
        const authResult = await msalInstance.acquireTokenPopup({
          scopes: ['User.Read'],
          account: accounts[0],
        });
        
        if (authResult && authResult.accessToken) {
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
  }
}

interface RequestOptions extends Omit<RequestInit, 'body' | 'headers' | 'onUploadProgress'> {
  headers?: Record<string, string | string[] | undefined> & {
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
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  return String(value);
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to convert various header formats to a plain object
const normalizeHeaders = (headers: HeadersInit | undefined): Record<string, string> => {
  const result: Record<string, string> = {};
  
  if (!headers) return result;
  
  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      result[key] = safeStringify(value);
    });
  } else if (Array.isArray(headers)) {
    headers.forEach(([key, value]) => {
      if (Array.isArray(value)) {
        result[key] = value.map(safeStringify).join(',');
      } else if (value !== undefined && value !== null) {
        result[key] = safeStringify(value);
      }
    });
  } else {
    Object.entries(headers).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        result[key] = value.map(safeStringify).join(',');
      } else if (value !== undefined && value !== null) {
        result[key] = safeStringify(value);
      }
    });
  }
  
  return result;
};

export const authFetch = async <T = unknown>(
  url: string, 
  options: RequestOptions = {},
  attempt = 1
): Promise<T> => {
  // Initialize headers from options or create a new object
  const headers = options.headers ? { ...normalizeHeaders(options.headers) } : {};
  
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

  // Prepare the request body
  let body: BodyInit | null | undefined;
  
  if (options.body === null || options.body === undefined) {
    body = null;
  } else if (options.body instanceof FormData || 
             options.body instanceof Blob || 
             options.body instanceof URLSearchParams || 
             typeof options.body === 'string' || 
             ArrayBuffer.isView(options.body)) {
    body = options.body as BodyInit;
  } else if (typeof options.body === 'object') {
    body = JSON.stringify(options.body);
    if (!headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
  } else {
    body = String(options.body);
  }

  // Convert headers to a format that fetch can use
  const fetchHeaders: Record<string, string> = {};
  Object.entries(headers).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      fetchHeaders[key] = String(value);
    }
  });

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
            fetchHeaders['Authorization'] = `Bearer ${token}`;
          } else if (import.meta.env.DEV) {
            console.log('Using development mock token');
            const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkRldiBVc2VyIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
            fetchHeaders['Authorization'] = `Bearer ${mockToken}`;
          } else {
            throw new Error('Authentication required but no valid token available');
          }
        }
      }
    } catch (error) {
      console.error('Error checking authentication status:', error);
      console.warn('Could not determine if authentication is required, proceeding without token');
    }
  }

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
      const { onUploadProgress, ...fetchOptions } = options;
      
      // Set default method if not provided
      if (!fetchOptions.method) {
        fetchOptions.method = 'GET';
      }
      
      // Always include credentials
      fetchOptions.credentials = 'include';
      
      // Convert headers to a format compatible with HeadersInit
      const normalizedHeaders: Record<string, string> = {};
      Object.entries(headers).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          normalizedHeaders[key] = String(value);
        }
      });
      
      // Set headers in a way that's compatible with both browser and Node.js
      if (Object.keys(normalizedHeaders).length > 0) {
        fetchOptions.headers = normalizedHeaders as Record<string, string>;
      }
      
      // Handle body separately to ensure it's a valid BodyInit type
      if (options.body !== undefined && options.body !== null) {
        if (typeof options.body === 'string' || 
            options.body instanceof Blob || 
            options.body instanceof FormData || 
            options.body instanceof URLSearchParams || 
            ArrayBuffer.isView(options.body)) {
          fetchOptions.body = options.body as BodyInit;
        } else if (typeof options.body === 'object') {
          fetchOptions.body = JSON.stringify(options.body);
          if (!headers['Content-Type']) {
            (fetchOptions.headers as Record<string, string>)['Content-Type'] = 'application/json';
          }
        } else {
          fetchOptions.body = String(options.body);
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
  get: <T = unknown>(endpoint: string, options: Omit<RequestOptions, 'body' | 'method'> = {}) => 
    authFetch<T>(endpoint, { ...options, method: 'GET' }),
    
  post: <T = unknown, D = unknown>(
    endpoint: string, 
    data?: D, 
    options: Omit<RequestOptions, 'body' | 'method'> = {}
  ) => {
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
