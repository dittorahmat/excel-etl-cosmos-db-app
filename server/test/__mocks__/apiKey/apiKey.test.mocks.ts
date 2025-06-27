import type { Container } from '@azure/cosmos';
import type { Request, Response, NextFunction } from 'express';
import type { AzureCosmosDB } from '../../../src/types/azure.js';
import type { ValidateApiKeyParams, ValidateApiKeyResult, ApiKey } from './apiKey.test.types.js';

// Create a factory function for the CosmosDB mock to avoid hoisting issues
const createMockCosmosDb = () => {
  // Create mock query response
  const mockQueryResponse = {
    fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
    fetchNext: vi.fn(),
    getAsyncIterator: vi.fn(),
    [Symbol.asyncIterator]: vi.fn()
  };

  const mockItems = {
    query: vi.fn().mockReturnValue(mockQueryResponse),
    create: vi.fn().mockImplementation((item: any) => 
      Promise.resolve({ resource: { ...item, id: 'test-id' } })
    ),
    read: vi.fn().mockResolvedValue({ resource: null }),
    upsert: vi.fn().mockImplementation((item: any) => 
      Promise.resolve({ resource: item })
    ),
    delete: vi.fn().mockResolvedValue({ statusCode: 204 })
  };

  const mockContainer = {
    items: mockItems,
    item: vi.fn().mockImplementation((id: string, partitionKey?: string) => ({
      read: vi.fn().mockResolvedValue({ resource: null }),
      replace: vi.fn().mockImplementation((item: any) => Promise.resolve({ resource: item })),
      delete: vi.fn().mockResolvedValue({ statusCode: 204 })
    }))
  };

  const mockDb = {
    cosmosClient: {
      database: vi.fn().mockReturnThis(),
      container: vi.fn().mockReturnThis()
    },
    container: vi.fn().mockImplementation((containerName: string) => Promise.resolve(mockContainer)),
    getContainer: vi.fn().mockImplementation((containerName: string) => Promise.resolve(mockContainer)),
    query: vi.fn().mockResolvedValue({ resources: [] }),
    upsertRecord: vi.fn().mockImplementation((item: any) => Promise.resolve(item)),
    getById: vi.fn().mockResolvedValue(null),
    deleteRecord: vi.fn().mockResolvedValue(true),
    validateApiKey: vi.fn().mockImplementation(async (params: { key: string; ipAddress?: string }) => {
      if (!params.key) {
        return { isValid: false, error: 'API key is required' };
      }
      
      // Handle different test cases based on key value
      if (params.key === 'valid-header-key' || params.key === 'valid-query-key') {
        return {
          isValid: true,
          key: {
            id: 'test-key-id',
            userId: 'test-user-id',
            keyHash: 'mocked-hash-value',
            name: 'Test Key',
            isActive: true,
            createdAt: new Date().toISOString(),
            allowedIps: params.ipAddress ? [params.ipAddress] : []
          }
        };
      }
      
      if (params.key === 'revoked-key') {
        return {
          isValid: false,
          error: 'API key has been revoked',
          key: {
            id: 'revoked-key-id',
            isActive: false,
            revokedAt: new Date().toISOString()
          }
        };
      }
      
      if (params.key === 'invalid-ip-key' && params.ipAddress === '10.0.0.1') {
        return {
          isValid: false,
          error: 'Access denied from this IP address'
        };
      }
      
      return {
        isValid: false,
        error: 'API key not found'
      };
    })
  };

  // Add mock implementation for validateApiKey
  mockDb.validateApiKey = vi.fn().mockImplementation(async (params: { key: string }) => {
    if (!params.key) {
      return { isValid: false, error: 'API key is required' };
    }
    
    // Handle different test cases based on key value
    if (params.key === 'valid-header-key' || params.key === 'valid-query-key') {
      return {
        isValid: true,
        key: {
          id: 'test-key-id',
          userId: 'test-user-id',
          name: 'Test API Key'
        }
      };
    }
    
    return { 
      isValid: false, 
      error: 'Invalid API key' 
    };
  });

  return mockDb as unknown as AzureCosmosDB;
};

// Create the mock instance
export const mockCosmosDb = createMockCosmosDb();

// Create a properly typed mock AzureCosmosDB implementation
export const createMockAzureCosmosDB = (): AzureCosmosDB => {
  return createMockCosmosDb();
};

// Create mock request/response/next function helpers
export const createTestMocks = () => {
  const req = {} as Request;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
    send: vi.fn()
  } as unknown as Response;
  const next = vi.fn() as NextFunction;
  
  return { req, res, next };
};

// Helper to create a test middleware instance
export const createTestMiddleware = () => {
  return {
    use: vi.fn()
  };
};

// Import utility functions and types from test utils
import { 
  createMockRequest as _createMockRequest, 
  createMockResponse as _createMockResponse, 
  createNextFunction as _createNextFunction, 
  createTestApiKey as _createTestApiKey, 
  testApiKey as _testApiKey
} from './apiKey.test.utils.js';
import type { TestRequest } from './apiKey.test.types.js';

// Re-export utility functions with proper ESM compatibility
export const createMockRequest = _createMockRequest;
export const createMockResponse = _createMockResponse;
export const createNextFunction = _createNextFunction;
export const createTestApiKey = _createTestApiKey;
export const testApiKey = _testApiKey;

// Re-export types
export type { TestRequest };

// Create mock ApiKeyRepository
export const mockValidateApiKey = vi.fn();

// Default mock implementation for validateApiKey
mockValidateApiKey.mockImplementation(async (params: { key: string; ipAddress?: string }) => {
  if (!params.key) {
    return { isValid: false, error: 'API key is required' };
  }
  
  if (params.key === 'valid-header-key' || params.key === 'valid-query-key') {
    return {
      isValid: true,
      key: {
        id: 'test-key-id',
        userId: 'test-user',
        name: 'Test Key',
        isActive: true,
        createdAt: new Date().toISOString(),
        lastUsedAt: null,
        allowedIps: ['*']
      }
    };
  }
  
  return { isValid: false, error: 'Invalid API key' };
});

export const mockApiKeyRepository = {
  validateApiKey: mockValidateApiKey,
  create: vi.fn().mockImplementation((data: any) => 
    Promise.resolve({ 
      ...data, 
      id: 'test-id', 
      createdAt: new Date().toISOString(),
      key: 'test-key-value',
      expiresAt: null,
      allowedIps: []
    })
  ),
  findById: vi.fn().mockResolvedValue({ 
    id: 'test-id', 
    name: 'Test Key',
    userId: 'test-user',
    isActive: true,
    createdAt: new Date().toISOString()
  }),
  delete: vi.fn().mockResolvedValue(undefined),
  listByUser: vi.fn().mockResolvedValue([]),
  revoke: vi.fn().mockResolvedValue(undefined),
  update: vi.fn().mockImplementation((id: string, data: any) => 
    Promise.resolve({ id, ...data })
  ),
  container: {
    items: {
      query: vi.fn().mockResolvedValue({ resources: [] })
    }
  }
};
