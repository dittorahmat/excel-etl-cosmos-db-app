// Shared test setup for all tests
import '@testing-library/jest-dom/vitest';

// Mock environment variables
Object.assign(process.env, {
  NODE_ENV: 'test',
  VITE_AUTH_ENABLED: 'false',
  VITE_AZURE_CLIENT_ID: 'test-client-id',
  VITE_AZURE_TENANT_ID: 'test-tenant-id',
});

// Mock window object for client tests
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

// Mock fetch
global.fetch = vi.fn();

export {};