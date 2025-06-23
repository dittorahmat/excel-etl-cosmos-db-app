import { vi, beforeAll, afterEach } from 'vitest';
import { cleanup as rtlCleanup } from '@testing-library/react';

// Mock matchMedia for MUI components
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
class ResizeObserverStub {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

window.ResizeObserver = window.ResizeObserver || ResizeObserverStub;

// Clean up after each test
afterEach(() => {
  rtlCleanup();
  vi.clearAllMocks();
});

// Set up environment variables
beforeAll(() => {
  // Set any required environment variables for testing
  process.env.NODE_ENV = 'test';
  process.env.REACT_APP_API_BASE_URL = 'http://localhost:3001';
});
