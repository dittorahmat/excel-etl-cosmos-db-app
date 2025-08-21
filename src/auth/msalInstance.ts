import { PublicClientApplication, type Configuration, type AccountInfo, type AuthenticationResult } from '@azure/msal-browser';
import { msalConfig } from './authConfig';
import { assertMsalConfig } from './authUtils';

// Check if authentication is disabled
console.log('MSAL Instance - Environment variables:', {
  VITE_AUTH_ENABLED: import.meta.env.VITE_AUTH_ENABLED,
  WINDOW_ENV_VITE_AUTH_ENABLED: window.ENV?.VITE_AUTH_ENABLED,
  NODE_ENV: import.meta.env.NODE_ENV,
  MODE: import.meta.env.MODE,
  WINDOW_USE_DUMMY_AUTH: window.USE_DUMMY_AUTH,
  WINDOW_FORCE_DUMMY_AUTH: window.FORCE_DUMMY_AUTH,
  WINDOW_SKIP_MSAL_INIT: window.SKIP_MSAL_INIT,
  WINDOW_ENV: window.ENV,
  WINDOW_APP_CONFIG: window.APP_CONFIG,
  locationHref: window.location.href,
  localStorageUseDummyAuth: localStorage.getItem('useDummyAuth')
});

const isDevelopment = import.meta.env.DEV;
const authEnabled = import.meta.env.VITE_AUTH_ENABLED !== 'false' && window.ENV?.VITE_AUTH_ENABLED !== 'false';
const useDummyAuth = !authEnabled || isDevelopment || window.USE_DUMMY_AUTH === true || window.FORCE_DUMMY_AUTH === true;

// Log authentication status for debugging
console.log('MSAL Instance - Authentication status:', {
  VITE_AUTH_ENABLED: import.meta.env.VITE_AUTH_ENABLED,
  WINDOW_ENV_VITE_AUTH_ENABLED: window.ENV?.VITE_AUTH_ENABLED,
  window_USE_DUMMY_AUTH: window.USE_DUMMY_AUTH,
  isDevelopment,
  useDummyAuth
});

// Create a mock MSAL instance
const createMockMsalInstance = () => {
  console.log('Using mock MSAL instance (authentication disabled)');
  
  // Mock account data
  const idTokenClaims = {
    name: 'Mock User',
    preferred_username: 'user@example.com',
    roles: ['user'],
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    iat: Math.floor(Date.now() / 1000)
  } as const;

  const mockAccount: AccountInfo = {
    homeAccountId: 'mock-account-id',
    environment: 'mock-environment',
    tenantId: 'mock-tenant-id',
    username: 'user@example.com',
    localAccountId: 'mock-local-account-id',
    name: 'Mock User',
    idTokenClaims: idTokenClaims as unknown as object // Type assertion to satisfy the type checker
  };
  
  // Mock authentication result
  const mockAuthResult: AuthenticationResult = {
    authority: 'https://login.microsoftonline.com/mock-tenant-id',
    uniqueId: 'mock-unique-id',
    tenantId: 'mock-tenant-id',
    scopes: ['User.Read'],
    account: mockAccount,
    idToken: 'mock-id-token',
    idTokenClaims: mockAccount.idTokenClaims,
    accessToken: 'mock-access-token',
    fromCache: false,
    expiresOn: new Date(Date.now() + 3600000), // 1 hour from now
    tokenType: 'Bearer',
    correlationId: 'mock-correlation-id',
    state: 'mock-state',
    fromNativeBroker: false
  };
  
  // Create a mock event dispatcher
  const eventCallbacks: Record<string, Function> = {};
  
  // Return the mock MSAL instance
  return {
    // Core authentication methods
    acquireTokenSilent: async () => {
      console.log('Mock: acquireTokenSilent called');
      return mockAuthResult;
    },
    
    loginRedirect: async () => {
      console.log('Mock: loginRedirect called - authentication is disabled');
      // Simulate successful login
      setTimeout(() => {
        window.dispatchEvent(new Event('msal:loginSuccess'));
        // Also call any registered callbacks
        Object.values(eventCallbacks).forEach(callback => {
          try {
            callback({ eventType: 'msal:loginSuccess', payload: mockAuthResult });
          } catch (e) {
            console.error('Error in MSAL event callback:', e);
          }
        });
      }, 100);
      return Promise.resolve();
    },
    
    logout: async () => {
      console.log('Mock: logout called');
      return Promise.resolve();
    },
    
    // Account management methods
    getAllAccounts: () => {
      console.log('Mock: getAllAccounts called');
      return [mockAccount];
    },
    
    getActiveAccount: () => {
      console.log('Mock: getActiveAccount called');
      return mockAccount;
    },
    
    setActiveAccount: (account: AccountInfo | null) => {
      console.log('Mock: setActiveAccount called', { account });
    },
    
    // Redirect handling
    handleRedirectPromise: async () => {
      console.log('Mock: handleRedirectPromise called');
      return mockAuthResult;
    },
    
    // Event handling
    addEventCallback: (callback: Function) => {
      console.log('Mock: addEventCallback called');
      const callbackId = `callback-${Date.now()}`;
      eventCallbacks[callbackId] = callback;
      return callbackId;
    },
    
    removeEventCallback: (callbackId: string) => {
      console.log('Mock: removeEventCallback called', { callbackId });
      delete eventCallbacks[callbackId];
    },
    
    // Add a property to indicate this is a mock instance
    isMock: true,
    
    // Add other required MSAL methods with no-op implementations
    loginPopup: async () => Promise.resolve(mockAuthResult),
    acquireTokenPopup: async () => Promise.resolve(mockAuthResult),
    acquireTokenRedirect: async () => Promise.resolve(),
    ssoSilent: async () => Promise.resolve(mockAuthResult),
    acquireTokenByCode: async () => Promise.resolve(mockAuthResult),
    initialize: async () => Promise.resolve(),
    setLogger: () => {},
    addPerformanceCallback: () => ({}),
    enableAccountStorageEvents: () => {},
    getLogger: () => ({
      error: console.error,
      warning: console.warn,
      info: console.log,
      verbose: console.debug,
      isErrorEnabled: true,
      isWarningEnabled: true,
      isInfoEnabled: true,
      isVerboseEnabled: true,
      clone: function() {
        return this;
      }
    }),
    
    // Additional methods that might be called by MSAL internals
    initializeWrapperLibrary: () => {},
    setNavigationClient: () => {},
    createNavigationClient: () => ({}),
    addPerformanceCallbackWithHeader: () => ({}),
    removePerformanceCallback: () => {},
    emitPerformanceEvent: () => {},
    getConfiguration: () => ({})
  } as unknown as PublicClientApplication; // Type assertion to satisfy the PublicClientApplication type
};

// Log the decision for MSAL instance creation
console.log('MSAL Instance - Creating MSAL instance with configuration:', {
  useDummyAuth,
  isDevelopment,
  authEnabled,
  window_USE_DUMMY_AUTH: window.USE_DUMMY_AUTH,
  window_FORCE_DUMMY_AUTH: window.FORCE_DUMMY_AUTH,
  window_SKIP_MSAL_INIT: window.SKIP_MSAL_INIT,
  localStorageUseDummyAuth: localStorage.getItem('useDummyAuth'),
  msalConfig: msalConfig ? { 
    ...msalConfig, 
    auth: { 
      ...msalConfig.auth
      // We're not including clientSecret in the debug output to avoid potential security issues
    } 
  } : null
});

// Create MSAL instance (real or mock based on configuration)
let msalInstance;

if (useDummyAuth) {
  console.log('MSAL Instance - Using MOCK MSAL instance');
  msalInstance = createMockMsalInstance();
} else {
  console.log('MSAL Instance - Using REAL MSAL instance');
  try {
    const config = assertMsalConfig(msalConfig) ? msalConfig : { auth: { clientId: '' } };
    console.log('MSAL Instance - MSAL config:', { 
      ...config, 
      auth: { 
        ...config.auth, 
        clientSecret: config.auth.clientSecret ? '***' : undefined 
      } 
    });
    msalInstance = new PublicClientApplication(config);
  } catch (error) {
    console.error('MSAL Instance - Error creating MSAL instance:', error);
    throw error;
  }
}

export { msalInstance };
