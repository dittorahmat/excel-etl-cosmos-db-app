// vitest.setup.ts

import '@testing-library/jest-dom';

// Vitest globals (describe, it, expect, vi, etc.) are available automatically in test files

// Mock window.matchMedia
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





// Global mock for multer
vi.mock('multer', () => {
  const multer = vi.fn(() => ({
    single: vi.fn().mockReturnValue(vi.fn()),
    array: vi.fn().mockReturnValue(vi.fn()),
    fields: vi.fn().mockReturnValue(vi.fn()),
    none: vi.fn().mockReturnValue(vi.fn()),
    any: vi.fn().mockReturnValue(vi.fn()),
  }));
  multer.diskStorage = vi.fn();
  multer.memoryStorage = vi.fn(() => ({
    _handleFile: vi.fn(),
    _removeFile: vi.fn(),
  }));
  return multer;
});

// Global mock for @azure/cosmos
vi.mock('@azure/cosmos', async () => {
  const actual = await vi.importActual('@azure/cosmos');
  return {
    ...actual,
    CosmosClient: vi.fn(() => ({
      database: vi.fn().mockReturnThis(),
      container: vi.fn().mockReturnThis(),
      items: {
        query: vi.fn().mockResolvedValue({ resources: [] }),
        create: vi.fn().mockResolvedValue({ resource: {} }),
      },
    })),
  };
});

// Global mock for uuid
vi.mock('uuid', () => ({
  v4: vi.fn().mockReturnValue('mocked-uuid'),
}));

// Global setup for each test file
beforeEach(() => {
  // Reset all mocks before each test
  vi.resetAllMocks();
  
  // Clear all instances and calls to constructor and all methods
  vi.clearAllMocks();
  
  
});

// Global teardown
afterAll(() => {
  // Clean up after all tests
  vi.restoreAllMocks();
});