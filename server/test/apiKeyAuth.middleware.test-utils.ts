import type { Request, Response, NextFunction } from 'express';
import type { ApiKey, ApiKeyRepository, TestRequest } from './apiKeyAuth.middleware.types.js';

// Default mock API key data
export const defaultMockApiKey = {
  id: 'test-key-id',
  userId: 'test-user',
  name: 'Test Key',
  keyHash: 'test-hash',
  isActive: true,
  allowedIps: ['192.168.1.1'],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 86400000).toISOString(),
  lastUsedAt: null,
  createdBy: 'test-user',
  updatedBy: 'test-user'
};

// Create a test API key
export const createTestApiKey = (overrides: Partial<ApiKey> = {}) => ({
  ...defaultMockApiKey,
  ...overrides,
  id: overrides.id || `test-key-${Math.random().toString(36).substring(2, 9)}`,
  keyHash: overrides.keyHash || `hash-${Math.random().toString(36).substring(2, 9)}`,
  createdAt: overrides.createdAt || new Date().toISOString(),
  updatedAt: overrides.updatedAt || new Date().toISOString(),
  expiresAt: overrides.expiresAt || new Date(Date.now() + 86400000).toISOString(),
});

// Create a mock request
export function createMockRequest(overrides: Partial<TestRequest> = {}): TestRequest {
  const mockRequest: any = {
    headers: {},
    query: {},
    body: {},
    ip: '192.168.1.1',
    ...overrides,
  };

  if (!mockRequest.query) {
    mockRequest.query = {};
  }

  const requiredMethods = [
    'get', 'header', 'accepts', 'acceptsCharsets', 'acceptsEncodings',
    'acceptsLanguages', 'range', 'param', 'is', 'getHeader', 'acceptsLanguage'
  ];

  requiredMethods.forEach(method => {
    if (typeof mockRequest[method] !== 'function') {
      mockRequest[method] = () => undefined;
    }
  });

  if (!mockRequest.headers) mockRequest.headers = {};
  if (!mockRequest.ip) mockRequest.ip = '192.168.1.1';

  return mockRequest as TestRequest;
}

// Create a mock response
export const createMockResponse = () => {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

// Create a next function
export const createNextFunction = (): NextFunction => vi.fn();

// Create a mock implementation for validateApiKey
export const createMockValidateApiKey = () => {
  return vi.fn().mockImplementation(async (params: { key: string; ipAddress?: string }) => {
    if (params.key === 'invalid-key') {
      return { isValid: false, key: null, error: 'Invalid API key' };
    }
    
    if (params.ipAddress && !defaultMockApiKey.allowedIps?.includes(params.ipAddress)) {
      return { 
        isValid: false, 
        key: null, 
        error: `IP address ${params.ipAddress} not allowed` 
      };
    }
    
    return { isValid: true, key: defaultMockApiKey };
  });
};

// Create a test repository
export const createTestRepository = (): ApiKeyRepository => ({
  validateApiKey: vi.fn().mockResolvedValue({ isValid: true, key: defaultMockApiKey })
});

// Set up default mock implementation
export const setupDefaultMock = (repository: ApiKeyRepository) => {
  vi.mocked(repository.validateApiKey).mockImplementation(
    createMockValidateApiKey()
  );
};

// Store original console methods
export const originalConsoleError = console.error;
export const originalConsoleDebug = console.debug;
