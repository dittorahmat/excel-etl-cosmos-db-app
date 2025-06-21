import { vi } from 'vitest';
import { config } from 'dotenv';

// Load environment variables from .env file
config({ path: '../../.env' });

// Set dummy Azure AD environment variables for testing
process.env.AZURE_CLIENT_ID = 'test-client-id';
process.env.AZURE_TENANT_ID = 'test-tenant-id';
process.env.AZURE_CLIENT_SECRET = 'test-client-secret';

// Mock global objects for Node.js environment
globalThis.URL = {
  createObjectURL: vi.fn(),
  revokeObjectURL: vi.fn()
} as any;

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

window.ResizeObserver = ResizeObserverMock;
