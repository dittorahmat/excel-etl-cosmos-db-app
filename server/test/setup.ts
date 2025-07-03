// server/test/setup.ts
import { config } from 'dotenv';
import { join } from 'path';
import { createHash as originalCreateHash, randomBytes as originalRandomBytes, timingSafeEqual as originalTimingSafeEqual } from 'crypto';

// Only apply mocks in test environment
const isTestEnv = process.env.NODE_ENV === 'test' || process.env.VITEST;

if (isTestEnv) {
  // Mock uuid
  (global as any).vi = (global as any).vi || {};
  (global as any).vi.mock = (global as any).vi.mock || (() => {});
  (global as any).vi.fn = (global as any).vi.fn || ((fn: any) => fn);
  (global as any).vi.importActual = (global as any).vi.importActual || ((mod: string) => import(mod));

  // Mock uuid
  (global as any).vi.mock('uuid', () => ({
    v4: (global as any).vi.fn(() => 'mock-uuid-v4'),
  }));

  // Mock crypto
  (global as any).vi.mock('crypto', async () => {
    const actual = await (global as any).vi.importActual('crypto');
    return {
      ...actual,
      createHash: (global as any).vi.fn((algorithm: string) => {
        const hash = actual.createHash(algorithm);
        return {
          update: (global as any).vi.fn((data: any) => {
            hash.update(data);
            return hash;
          }),
          digest: (global as any).vi.fn((encoding: any) => {
            return originalCreateHash(algorithm).update('mocked-hash').digest(encoding);
          }),
        };
      }),
      randomBytes: (global as any).vi.fn((size: number) => {
        return Buffer.alloc(size, 0);
      }),
      timingSafeEqual: (global as any).vi.fn((a: Buffer, b: Buffer) => {
        return a.length === b.length && a.equals(b);
      }),
    };
  });

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
      createObjectURL: (global as any).vi.fn(),
      revokeObjectURL: (global as any).vi.fn()
    } as any;
  }

  // Mock fetch API if not available
  if (!globalThis.fetch) {
    globalThis.fetch = (global as any).vi.fn().mockResolvedValue({
      ok: true,
      json: (global as any).vi.fn().mockResolvedValue({}),
      text: (global as any).vi.fn().mockResolvedValue(''),
      blob: (global as any).vi.fn().mockResolvedValue(new Blob()),
    });
  }

  // Mock localStorage and sessionStorage
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem(key: string) {
        return store[key] || null;
      },
      setItem(key: string, value: string) {
        store[key] = String(value);
      },
      removeItem(key: string) {
        delete store[key];
      },
      clear() {
        store = {};
      },
      get length() {
        return Object.keys(store).length;
      },
      key(index: number) {
        return Object.keys(store)[index] || null;
      },
    };
  })();

  const sessionStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem(key: string) {
        return store[key] || null;
      },
      setItem(key: string, value: string) {
        store[key] = String(value);
      },
      removeItem(key: string) {
        delete store[key];
      },
      clear() {
        store = {};
      },
      get length() {
        return Object.keys(store).length;
      },
      key(index: number) {
        return Object.keys(store)[index] || null;
      },
    };
  })();

  // Only define window and document in Node.js environment
  if (typeof window === 'undefined') {
    // @ts-ignore
    global.window = {
      localStorage: localStorageMock,
      sessionStorage: sessionStorageMock,
      addEventListener: (global as any).vi.fn(),
      removeEventListener: (global as any).vi.fn(),
      // Add other window properties as needed
    } as any;

    // @ts-ignore
    global.document = {
      addEventListener: (global as any).vi.fn(),
      removeEventListener: (global as any).vi.fn(),
      // Add other document properties as needed
    } as any;
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
    observe = (global as any).vi.fn();
    unobserve = (global as any).vi.fn();
    disconnect = (global as any).vi.fn();
  }

  // Only define window and document in Node.js environment
  if (isTestEnv && typeof window !== 'undefined') {
    // Browser environment setup
    window.ResizeObserver = ResizeObserverMock;

    // Mock window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (global as any).vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: (global as any).vi.fn(), // Deprecated
        removeListener: (global as any).vi.fn(), // Deprecated
        addEventListener: (global as any).vi.fn(),
        removeEventListener: (global as any).vi.fn(),
        dispatchEvent: (global as any).vi.fn(),
      })),
    });

    // Mock window.scrollTo
    window.scrollTo = (global as any).vi.fn();

    // Mock window.URL.createObjectURL
    if (window.URL) {
      Object.defineProperty(window.URL, 'createObjectURL', {
        value: (global as any).vi.fn(),
      });

      // Mock window.URL.revokeObjectURL
      Object.defineProperty(window.URL, 'revokeObjectURL', {
        value: (global as any).vi.fn(),
      });
    }
  }

  // Global test hooks
  beforeAll(() => {
    // Setup code before all tests run
    console.log('Setting up test environment...');
  });

  afterEach(() => {
    // Cleanup after each test
    if ((global as any).vi) {
      (global as any).vi.clearAllMocks();
      (global as any).vi.resetAllMocks();
    }
  });

  afterAll(() => {
    // Cleanup after all tests
    if ((global as any).vi) {
      (global as any).vi.restoreAllMocks();
    }
  });
}
