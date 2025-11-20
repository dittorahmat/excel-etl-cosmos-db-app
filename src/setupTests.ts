
import React from 'react';
import { vi, beforeAll, afterEach, afterAll, beforeEach, expect } from 'vitest';
import { cleanup as rtlCleanup, act } from '@testing-library/react';
import { cleanup as customCleanup } from './test-utils';

// Configure Vitest's expect with DOM matchers
expect.extend({
  // Add any custom matchers here if needed
});

// Configure global test environment for React 18
const originalConsole = { ...console };

declare global {
  interface Window {
    ResizeObserver: typeof ResizeObserver;
    matchMedia: (query: string) => MediaQueryList;
  }
}

// Mock matchMedia for MUI components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock the auth config
vi.mock('../../src/auth/authConfig.ts', () => ({
  msalConfig: {
    auth: {
      clientId: 'test-client-id',
      authority: 'https://login.microsoftonline.com/test-tenant-id',
      redirectUri: 'http://localhost:3000',
      postLogoutRedirectUri: 'http://localhost:3000',
      navigateToLoginRequestUrl: true,
    },
    cache: {
      cacheLocation: 'sessionStorage',
      storeAuthStateInCookie: false,
    },
  },
  loginRequest: {
    scopes: ['api://test-api-scope/.default'],
  },
  tokenRequest: {
    scopes: ['api://test-api-scope/.default'],
    forceRefresh: false,
  },
}));

// Mock MSAL Browser and React with proper hoisting
const { mockMsalInstance } = vi.hoisted(() => {
  const mockInstance = {
    loginPopup: vi.fn().mockResolvedValue({
      account: { 
        homeAccountId: 'test-account-id',
        environment: 'test',
        tenantId: 'test-tenant-id',
        username: 'test@example.com',
        localAccountId: 'local-test-account-id',
        name: 'Test User',
      },
      accessToken: 'test-access-token',
      idToken: 'test-id-token',
      scopes: ['api://test-api-scope/.default'],
      expiresOn: new Date(Date.now() + 3600000),
    }),
    logout: vi.fn().mockResolvedValue(undefined),
    getAllAccounts: vi.fn().mockReturnValue([{
      homeAccountId: 'test-account-id',
      environment: 'test',
      tenantId: 'test-tenant-id',
      username: 'test@example.com',
      localAccountId: 'local-test-account-id',
      name: 'Test User',
    }]),
    acquireTokenSilent: vi.fn().mockResolvedValue({
      accessToken: 'test-access-token',
      idToken: 'test-id-token',
      expiresOn: new Date(Date.now() + 3600000),
    }),
    setActiveAccount: vi.fn(),
    handleRedirectPromise: vi.fn().mockResolvedValue(null),
    addEventCallback: vi.fn(),
    removeEventCallback: vi.fn(),
  };

  return { mockMsalInstance: mockInstance };
});

// Mock MSAL Browser
vi.mock('@azure/msal-browser', async () => {
  const actual = await vi.importActual('@azure/msal-browser');
  return {
    ...(actual as object),
    PublicClientApplication: vi.fn().mockImplementation(() => mockMsalInstance),
    InteractionRequiredAuthError: class MockInteractionRequiredAuthError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'InteractionRequiredAuthError';
      }
    },
  };
});

// Mock MSAL React
vi.mock('@azure/msal-react', () => ({
  useMsal: () => ({
    instance: mockMsalInstance,
    accounts: [{
      homeAccountId: 'test-account-id',
      environment: 'test',
      tenantId: 'test-tenant-id',
      username: 'test@example.com',
      localAccountId: 'local-test-account-id',
      name: 'Test User',
    }],
    inProgress: 'none',
  }),
  useIsAuthenticated: () => true,
  useAccount: vi.fn().mockReturnValue({
    homeAccountId: 'test-account-id',
    environment: 'test',
    tenantId: 'test-tenant-id',
    username: 'test@example.com',
    localAccountId: 'local-test-account-id',
    name: 'Test User',
  }),
  MsalProvider: function MockMsalProvider({ children }: { children: React.ReactNode }) {
    return React.createElement('div', { 'data-testid': 'mock-msal-provider' }, children);
  },
  __esModule: true,
}));

// Set up environment variables
beforeAll(() => {
  vi.stubEnv('VITE_AZURE_AD_CLIENT_ID', 'test-client-id');
  vi.stubEnv('VITE_AZURE_AD_TENANT_ID', 'test-tenant-id');
  vi.stubEnv('VITE_AZURE_AD_REDIRECT_URI', 'http://localhost:3000');
  vi.stubEnv('VITE_API_SCOPE', 'api://test-api-scope');
  vi.stubEnv('NODE_ENV', 'test');

  // Ensure window is defined (for tests that might run in Node.js environment)
  if (typeof window === 'undefined') {
    global.window = {
      ...global.window,
      localStorage: global.localStorage,
      sessionStorage: global.sessionStorage,
      matchMedia: () => ({
        matches: false,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    } as unknown as Window & typeof globalThis;
  }
});

// Clean up after each test
afterEach(async () => {
  try {
    // First clean up any test-utils specific cleanup
    await customCleanup();
    
    // Then clean up RTL
    rtlCleanup();
    
    // Clear all mocks and reset state
    vi.clearAllMocks();
    vi.resetAllMocks();
    vi.resetModules();
    
    // Clear storage
    localStorage.clear();
    sessionStorage.clear();
    
    // Reset any timers
    vi.useRealTimers();
    
    // Wait for any pending promises to resolve
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Wait for any pending React updates to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
  } catch (error) {
    console.error('Error during test cleanup:', error);
  }
});

// Ensure we clean up after all tests
afterAll(() => {
  try {
    vi.clearAllMocks();
    vi.resetAllMocks();
    vi.resetModules();
    vi.restoreAllMocks();
    
    // Restore console methods using the original console
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
    
    // Clean up any remaining timers
    vi.useRealTimers();
  } catch (error) {
    console.error('Error in afterAll cleanup:', error);
  }
});

// Suppress expected error logs in tests
beforeEach(() => {
  // Suppress React 18 act() warnings
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    // Ignore React 18 act() warnings
    if (typeof args[0] === 'string' && args[0].includes('act(...)')) {
      return;
    }
    originalConsole.error(...args);
  });
  
  // Suppress React 18 deprecation warnings
  vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
    // Ignore React 18 deprecation warnings
    if (typeof args[0] === 'string' && 
        (args[0].includes('ReactDOM.render') || 
         args[0].includes('ReactDOM.hydrate') ||
         args[0].includes('ReactDOM.unstable_createRoot'))) {
      return;
    }
    originalConsole.warn(...args);
  });
});

// Mock ResizeObserver
class ResizeObserverStub {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

window.ResizeObserver = window.ResizeObserver || ResizeObserverStub;
