import { PublicClientApplication, type AccountInfo, type AuthenticationResult } from '@azure/msal-browser';
import { getMsalConfig } from './authConfig';
import { assertMsalConfig } from './authUtils';

// Create a function that returns the MSAL instance when needed
let cachedMsalInstance: PublicClientApplication | null = null;

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
    idTokenClaims: idTokenClaims as unknown as Record<string, unknown>
  };
  
  // Mock authentication result
  const mockAuthResult: AuthenticationResult = {
    authority: 'https://login.microsoftonline.com/mock-tenant-id',
    uniqueId: 'mock-unique-id',
    tenantId: 'mock-tenant-id',
    scopes: ['User.Read'],
    account: mockAccount,
    idToken: 'mock-id-token',
    idTokenClaims: mockAccount.idTokenClaims as Record<string, unknown>,
    accessToken: 'mock-access-token',
    fromCache: false,
    expiresOn: new Date(Date.now() + 3600000), // 1 hour from now
    tokenType: 'Bearer',
    correlationId: 'mock-correlation-id',
    state: 'mock-state',
    fromNativeBroker: false
  };
  
  // Create a mock event dispatcher
  type EventCallback = (message: unknown) => void; // Using 'unknown' to be more type-safe
  const eventCallbacks: Record<string, EventCallback> = {};
  
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
    addEventCallback: (callback: EventCallback) => {
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
  } as unknown as PublicClientApplication;
};

// Create the real MSAL instance
const createRealMsalInstance = () => {
  try {
    // Check if authentication is disabled
    const msalConfig = getMsalConfig();
    
    console.log('MSAL Instance - Environment variables:', {
      VITE_AUTH_ENABLED: import.meta.env.VITE_AUTH_ENABLED,
      AUTH_ENABLED: import.meta.env.AUTH_ENABLED,
      WINDOW_ENV_VITE_AUTH_ENABLED: window.ENV?.VITE_AUTH_ENABLED,
      WINDOW_ENV_AUTH_ENABLED: window.ENV?.AUTH_ENABLED,
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
    const windowEnvViteAuthEnabled = window.ENV?.VITE_AUTH_ENABLED || window.__APP_CONFIG__?.VITE_AUTH_ENABLED;
    const windowEnvAuthEnabled = window.ENV?.AUTH_ENABLED || window.__APP_CONFIG__?.AUTH_ENABLED;

    // Check if auth is explicitly enabled in any of the possible sources
    const authExplicitlyEnabled = 
      import.meta.env.VITE_AUTH_ENABLED === 'true' || 
      import.meta.env.AUTH_ENABLED === 'true' ||
      windowEnvViteAuthEnabled === 'true' || 
      windowEnvAuthEnabled === 'true' ||
      windowEnvViteAuthEnabled === true || 
      windowEnvAuthEnabled === true;

    // Check if auth is explicitly disabled
    const authExplicitlyDisabled = 
      import.meta.env.VITE_AUTH_ENABLED === 'false' || 
      import.meta.env.AUTH_ENABLED === 'false' ||
      windowEnvViteAuthEnabled === 'false' || 
      windowEnvAuthEnabled === 'false' ||
      windowEnvViteAuthEnabled === false || 
      windowEnvAuthEnabled === false;

    // Use dummy auth only if:
    // 1. Auth is explicitly disabled, OR
    // 2. We're in development and auth is not explicitly enabled
    const useDummyAuth = 
      authExplicitlyDisabled || 
      (!authExplicitlyEnabled && isDevelopment) ||
      window.FORCE_DUMMY_AUTH === true;

    // Log the decision for MSAL instance creation
    console.log('MSAL Instance - Creating MSAL instance with configuration:', {
      useDummyAuth,
      isDevelopment,
      authExplicitlyEnabled,
      window_USE_DUMMY_AUTH: window.USE_DUMMY_AUTH,
      window_FORCE_DUMMY_AUTH: window.FORCE_DUMMY_AUTH,
      window_SKIP_MSAL_INIT: window.SKIP_MSAL_INIT,
      localStorageUseDummyAuth: localStorage.getItem('useDummyAuth'),
      msalConfig: msalConfig ? { 
        ...msalConfig, 
        auth: { 
          ...msalConfig.auth,
          clientId: msalConfig.auth.clientId ? `${msalConfig.auth.clientId.substring(0, 4)}...${msalConfig.auth.clientId.substring(msalConfig.auth.clientId.length - 4)}` : 'MISSING'
          // We're not including clientSecret in the debug output to avoid potential security issues
        } 
      } : null
    });

    if (useDummyAuth) {
      console.log('MSAL Instance - Using MOCK MSAL instance');
      return createMockMsalInstance();
    } else {
      console.log('MSAL Instance - Using REAL MSAL instance');
      const config = assertMsalConfig(msalConfig) ? msalConfig : { auth: { clientId: '' } };
      console.log('MSAL Instance - MSAL config:', { 
        ...config, 
        auth: { 
          ...config.auth,
          clientId: config.auth.clientId ? `${config.auth.clientId.substring(0, 4)}...${config.auth.clientId.substring(config.auth.clientId.length - 4)}` : 'MISSING'
        } 
      });
      return new PublicClientApplication(config);
    }
  } catch (error) {
    console.error('MSAL Instance - Error creating MSAL instance:', error);
    throw error;
  }
};

// Export a getter function that creates the instance when first accessed
export const getMsalInstance = (): PublicClientApplication => {
  if (!cachedMsalInstance) {
    cachedMsalInstance = createRealMsalInstance();
  }
  return cachedMsalInstance;
};

// For backward compatibility, we can also export a default instance
// but this will be created lazily
let defaultInstance: PublicClientApplication | null = null;
export const msalInstance: PublicClientApplication = new Proxy({} as PublicClientApplication, {
  get(_target, prop) {
    if (!defaultInstance) {
      defaultInstance = createRealMsalInstance();
    }
    return (defaultInstance as { [key: string]: unknown })[prop as string];
  }
});

export type { PublicClientApplication };
