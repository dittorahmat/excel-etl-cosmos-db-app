import { msalInstance } from '../auth/msalInstance';
import { InteractionRequiredAuthError } from '@azure/msal-browser';

// Extended Response type with generic JSON body
type ApiResponse<T = unknown> = Response & {
  json(): Promise<T>;
};

export const getAuthToken = async (): Promise<string | null> => {
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

export const authFetch = async <T = unknown>(
  url: string, 
  options: RequestOptions = {}
): Promise<ApiResponse<T>> => {
  const headers = new Headers(options.headers);
  
  // Only set Content-Type to application/json if it's not a FormData object
  // and Content-Type is not already set
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.append('Content-Type', 'application/json');
  }
  
  // Check if authentication is required
  try {
    // First, check if the server requires authentication
    const authStatusResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/auth/status`);
    const authStatus = await authStatusResponse.json();
    
    const authRequired = authStatus.authRequired !== false;
    
    if (authRequired) {
      // Try to get a valid token
      try {
        const token = await getAuthToken();
        if (token) {
          headers.set('Authorization', `Bearer ${token}`);
        } else if (import.meta.env.DEV) {
          console.log('Using development mock token');
          const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkRldiBVc2VyIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
          headers.set('Authorization', `Bearer ${mockToken}`);
        } else {
          console.warn('Authentication is required but no token is available');
        }
      } catch (error) {
        console.error('Error during authentication:', error);
        // In development, continue with a mock token
        if (import.meta.env.DEV) {
          console.log('Falling back to mock token due to error');
          const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkRldiBVc2VyIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
          headers.set('Authorization', `Bearer ${mockToken}`);
        }
      }
    } else {
      console.log('Authentication is not required for this endpoint');
    }
  } catch (error) {
    console.error('Error checking authentication status:', error);
    // If we can't check the auth status, assume authentication is required
    console.warn('Could not determine if authentication is required, proceeding without token');
  }
  
  // Get base URL from environment and ensure it doesn't end with a slash
  let baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001').replace(/\/+$/, '');
  
  // Clean the URL path by removing leading/trailing slashes
  const cleanPath = url.replace(/^\/+|\/+$/g, '');
  
  // Construct the full URL, ensuring we don't have double /api
  let fullUrl;
  if (cleanPath.startsWith('http')) {
    // If it's a full URL, use it as is
    fullUrl = cleanPath;
  } else if (cleanPath.startsWith('api/') || baseUrl.endsWith('/api')) {
    // If the path already starts with api/ or base URL ends with /api, don't add another /api
    fullUrl = `${baseUrl}/${cleanPath}`;
  } else {
    // Otherwise, add /api/ prefix
    fullUrl = `${baseUrl}/api/${cleanPath}`;
  }
  
  // For development, use the full URL to ensure proper routing through the dev server
  const requestUrl = import.meta.env.DEV ? fullUrl : fullUrl;
  
  // If it's a file upload with progress tracking
  const { onUploadProgress, ...fetchOptions } = options;
  
  if (onUploadProgress) {
    if (!(options.body instanceof FormData)) {
      throw new Error('onUploadProgress is only supported with FormData');
    }

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.open(options.method || 'POST', requestUrl, true);
      
      // Set headers
      headers.forEach((value, key) => {
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
        // Clone the response text to avoid 'already read' errors
        const responseText = xhr.responseText;
        
        // Create a new response with the cloned text
        const response = new Response(responseText, {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: new Headers({
            'Content-Type': xhr.getResponseHeader('Content-Type') || 'application/json'
          })
        }) as ApiResponse<T>;
        
        // Add json method to the response
        response.json = async () => {
          try {
            if (!responseText) return Promise.resolve({});
            return JSON.parse(responseText);
          } catch (error) {
            console.error('Error parsing JSON response:', error);
            return Promise.reject(new Error('Invalid JSON response'));
          }
        };
        
        // Handle non-2xx responses
        if (!xhr.status.toString().startsWith('2')) {
          let errorMessage = `Request failed with status ${xhr.status}`;
          try {
            const errorData = responseText ? JSON.parse(responseText) : {};
            errorMessage = errorData.message || errorMessage;
          } catch (_) { /* Ignore JSON parse errors */ }
          
          const error = new Error(errorMessage);
          (error as any).status = xhr.status;
          (error as any).response = response;
          reject(error);
        } else {
          resolve(response);
        }
      };
      
      xhr.onerror = () => {
        reject(new Error('Network error'));
      };
      
      xhr.send(options.body as XMLHttpRequestBodyInit);
    });
  }

  // Regular fetch for non-upload requests
  try {
    // fetchOptions already extracted above
    const body = prepareBody(options.body);
    
    const response = await fetch(requestUrl, {
      ...fetchOptions,
      body,
      headers,
      credentials: 'include' // Important for cookies/auth
    } as RequestInit);
    
    // Check if response is JSON before trying to parse it
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      if (!response.ok) {
        const error = new Error(data.message || 'Request failed');
        (error as { response?: Response }).response = response;
        throw error;
      }
      return response as ApiResponse<T>;
    } else if (!response.ok) {
      const text = await response.text();
      const error = new Error(`Request failed with status ${response.status}: ${text}`);
      (error as { response?: Response }).response = response;
      throw error;
    }
    
    return response as ApiResponse<T>;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};

interface ApiClient {
  get: <T = unknown>(endpoint: string, options?: Omit<RequestOptions, 'body' | 'method'>) => Promise<ApiResponse<T>>;
  post: <T = unknown, D = unknown>(
    endpoint: string, 
    data?: D, 
    options?: Omit<RequestOptions, 'body' | 'method'>
  ) => Promise<ApiResponse<T>>;
  put: <T = unknown, D = unknown>(
    endpoint: string, 
    data?: D, 
    options?: Omit<RequestOptions, 'body' | 'method'>
  ) => Promise<ApiResponse<T>>;
  delete: <T = unknown>(
    endpoint: string, 
    options?: Omit<RequestOptions, 'body' | 'method'>
  ) => Promise<ApiResponse<T>>;
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
