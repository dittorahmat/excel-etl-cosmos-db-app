
import { vi, beforeAll, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

declare global {
  interface Window {
    ResizeObserver: typeof ResizeObserver;
  }
}

// Mock the auth config
vi.mock('../../src/auth/authConfig', () => ({
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

// Mock MSAL
vi.mock('@azure/msal-browser', () => ({
  PublicClientApplication: vi.fn().mockImplementation(() => ({
    loginPopup: vi.fn().mockResolvedValue({
      account: { name: 'Test User', username: 'test@example.com' },
      accessToken: 'test-access-token',
      idToken: 'test-id-token',
      expiresOn: new Date(Date.now() + 3600000).toISOString(),
    }),
    logout: vi.fn().mockResolvedValue(undefined),
    getAllAccounts: vi.fn().mockReturnValue([]),
    acquireTokenSilent: vi.fn().mockResolvedValue({
      accessToken: 'test-access-token',
      idToken: 'test-id-token',
      expiresOn: new Date(Date.now() + 3600000).toISOString(),
    }),
    setActiveAccount: vi.fn(),
    handleRedirectPromise: vi.fn().mockResolvedValue(null),
  })),
}));

// Mock MSAL React
vi.mock('@azure/msal-react', () => ({
  useMsal: vi.fn().mockReturnValue({
    instance: {
      loginPopup: vi.fn(),
      logout: vi.fn(),
      getAllAccounts: vi.fn().mockReturnValue([]),
      acquireTokenSilent: vi.fn(),
    },
    accounts: [],
    inProgress: 'none',
  }),
  MsalProvider: ({ children }: { children: React.ReactNode }) => children,
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
afterEach(() => {
  vi.clearAllMocks();
  vi.resetAllMocks();
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
});

// Mock ResizeObserver
class ResizeObserverStub {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

window.ResizeObserver = window.ResizeObserver || ResizeObserverStub;
