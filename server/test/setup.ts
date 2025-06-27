// server/test/setup.ts
import { config } from 'dotenv';
import { join } from 'path';

// Vitest globals (describe, it, expect, vi, beforeAll, afterAll, afterEach, etc.)
// are available automatically in test files

// Load environment variables from .env file
const envPath = join(process.cwd(), '.env');
config({ path: envPath });

// Set default test environment variables
process.env.NODE_ENV = 'test';
process.env.TZ = 'UTC';

// Set dummy Azure AD environment variables for testing
process.env.AZURE_CLIENT_ID = 'test-client-id';
process.env.AZURE_TENANT_ID = 'test-tenant-id';
process.env.AZURE_CLIENT_SECRET = 'test-client-secret';
process.env.AZURE_STORAGE_CONNECTION_STRING = 'DefaultEndpointsProtocol=https;AccountName=test;AccountKey=test;EndpointSuffix=core.windows.net';
process.env.COSMOS_DB_ENDPOINT = 'https://test.documents.azure.com:443/';
process.env.COSMOS_DB_KEY = 'test-key';
process.env.COSMOS_DB_ID = 'test-db';
process.env.COSMOS_DB_CONTAINER_ID = 'test-container';

// Mock global objects for Node.js environment
if (!globalThis.URL) {
  globalThis.URL = {
    createObjectURL: vi.fn(),
    revokeObjectURL: vi.fn()
  } as any;
}

// Mock fetch API if not available
if (!globalThis.fetch) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: vi.fn().mockResolvedValue({}),
    text: vi.fn().mockResolvedValue(''),
    blob: vi.fn().mockResolvedValue(new Blob()),
  });
}

// Mock localStorage and sessionStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key(index: number) {
      return Object.keys(store)[index] || null;
    }
  };
})();

const sessionStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key(index: number) {
      return Object.keys(store)[index] || null;
    }
  };
})();

// Only define window and document in Node.js environment
if (typeof window === 'undefined') {
  // @ts-ignore
  global.window = {
    localStorage: localStorageMock,
    sessionStorage: sessionStorageMock,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    // Add other window properties as needed
  };

  // @ts-ignore
  global.document = {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    // Add other document properties as needed
  };
}

// Assign mocks to global object
Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  configurable: true,
  enumerable: true,
  writable: true,
});

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
  configurable: true,
  enumerable: true,
  writable: true,
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

// Only define window and document in Node.js environment
if (typeof window !== 'undefined') {
  // Browser environment setup
  window.ResizeObserver = ResizeObserverMock;
  
  // Mock matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

// Global test hooks
beforeAll(() => {
  // Setup code before all tests run
  console.log('Setting up test environment...');
});

afterEach(() => {
  // Cleanup after each test
  vi.clearAllMocks();
  vi.resetAllMocks();
});

afterAll(() => {
  // Cleanup after all tests
  vi.restoreAllMocks();
});
