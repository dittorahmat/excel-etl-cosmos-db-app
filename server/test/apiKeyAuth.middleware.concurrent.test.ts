import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
// Source imports
import { apiKeyAuth } from '../src/middleware/apiKeyAuth.js';
import { ApiKeyRepository } from '../src/repositories/apiKeyRepository.js';
import type { AzureCosmosDB } from '../src/types/azure.js';

// Test utilities
import { createTestApiKey, createMockRequest, createMockResponse } from './apiKeyAuth.middleware.test-utils.js';
import type { TestRequest, ValidationResult, ApiKey, ApiKeyValidationResult } from './apiKeyAuth.middleware.types.js';

// Extend the global Express namespace to include our custom properties
declare global {
  namespace Express {
    interface Request {
      user?: { [key: string]: any; oid?: string | undefined } | undefined;
      apiKey?: {
        id: string;
        userId: string;
        name: string;
      };
    }
  }
}

// Mock the ApiKeyRepository module first to avoid hoisting issues
const createMockApiKey = (id: string, userId: string, name: string) => ({
  id,
  userId,
  name,
  keyHash: `hashed-${id}`,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isActive: true,
  expiresAt: new Date(Date.now() + 86400000).toISOString(), // 1 day from now
  lastUsedAt: null,
  lastUsedFromIp: null,
  allowedIps: ['*'],
  description: 'Test API Key',
  createdBy: userId,
  updatedBy: userId,
  scopes: ['read', 'write']
});

const mockApiKey1 = createMockApiKey('key-1', 'user-1', 'Key 1');
const mockApiKey2 = createMockApiKey('key-2', 'user-2', 'Key 2');

const mockValidateApiKey = vi.fn().mockImplementation(async (params: { key: string; ipAddress?: string }) => {
  if (!params.key) {
    return { isValid: false, error: 'API key is required' };
  }
  
  // Mock different API key responses based on the key
  if (params.key === 'key1') {
    return { isValid: true, key: mockApiKey1 };
  } else if (params.key === 'key2') {
    return { isValid: true, key: mockApiKey2 };
  } else if (params.key === 'rate-limited-key') {
    return { isValid: true, key: createMockApiKey('rate-limited-key', 'user-1', 'Rate Limited Key') };
  }
  
  return { isValid: false, error: 'Invalid API key' };
});

// Mock the API key repository
vi.mock('../src/repositories/apiKeyRepository', () => {
  // Create the mock implementation inside the factory function
  const mockApiKeyRepository = vi.fn().mockImplementation(() => ({
    validateApiKey: mockValidateApiKey,
    // Add other required methods with default implementations
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    list: vi.fn()
  }));
  
  return {
    ApiKeyRepository: mockApiKeyRepository
  };
});

// Set up test environment
let testRepository: ApiKeyRepository;

// Mock Azure CosmosDB
const mockCosmosDb = {
  database: vi.fn().mockReturnThis(),
  container: vi.fn().mockReturnThis(),
  items: {
    query: vi.fn().mockResolvedValue({ resources: [] })
  }
} as unknown as AzureCosmosDB;

describe('API Key Authentication Middleware - Concurrent Validation', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    // Create a new instance of the mock repository
    testRepository = new ApiKeyRepository(mockCosmosDb);
    
    // Mock the validateApiKey method on the repository instance
    testRepository.validateApiKey = vi.fn().mockImplementation(async (params: { key: string; ipAddress?: string }) => {
      if (!params.key) {
        return { isValid: false, error: 'API key is required' };
      }
      
      // Mock a valid API key response
      return {
        isValid: true,
        key: {
          id: 'test-key-id',
          userId: 'test-user-id',
          name: 'Test API Key',
          keyPrefix: 'test_',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isActive: true,
          expiresAt: new Date(Date.now() + 86400000).toISOString(), // 1 day from now
          lastUsedAt: null,
          lastUsedFromIp: null,
          allowedIps: params.ipAddress ? [params.ipAddress] : ['*'],
          description: 'Test API Key',
          createdBy: 'test-user-id',
          updatedBy: 'test-user-id',
          scopes: ['read', 'write']
        }
      };
    });
  });

  it('should handle concurrent API key validations', async () => {
    // Arrange
    const mockApiKey1 = createTestApiKey({
      id: 'key-1',
      name: 'Key 1',
      userId: 'user-1',
      keyHash: `hashed-key-1`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true,
      expiresAt: new Date(Date.now() + 86400000).toISOString(), // 1 day from now
      lastUsedAt: null,
      lastUsedFromIp: null,
      allowedIps: ['*']
    });
    
    const mockApiKey2 = createTestApiKey({
      id: 'key-2',
      name: 'Key 2',
      userId: 'user-2',
      keyHash: `hashed-key-2`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true,
      expiresAt: new Date(Date.now() + 86400000).toISOString(), // 1 day from now
      lastUsedAt: null,
      lastUsedFromIp: null,
      allowedIps: ['*']
    });

    // Setup mock to resolve with different keys based on input
    mockValidateApiKey.mockImplementation(async (params: { key: string }) => {
      if (params.key === 'key1') {
        return { isValid: true, key: mockApiKey1 };
      } else if (params.key === 'key2') {
        return { isValid: true, key: mockApiKey2 };
      }
      return { isValid: false, key: null };
    });

    // Create two separate requests
    const req1 = createMockRequest() as TestRequest;
    const req2 = createMockRequest() as TestRequest;
    const res = createMockResponse() as Response;
    
    req1.headers.authorization = 'ApiKey key1';
    req2.headers.authorization = 'ApiKey key2';

    // Act - Run validations concurrently
    type ValidationResult = {
      err?: Error;
      apiKey?: any;
    };

    const [result1, result2] = await Promise.all([
      // First request
      new Promise<ValidationResult>((resolve) => {
        const next = (err?: Error) => resolve({ 
          err: err || undefined, 
          apiKey: (req1 as TestRequest).apiKey 
        });
        apiKeyAuth(testRepository)(req1 as Request, res as Response, next as NextFunction);
      }),
      // Second request
      new Promise<ValidationResult>((resolve) => {
        const next = (err?: Error) => resolve({ 
          err: err || undefined, 
          apiKey: (req2 as TestRequest).apiKey 
        });
        apiKeyAuth(testRepository)(req2 as Request, res as Response, next as NextFunction);
      })
    ]);
    
    // Assert
    expect(testRepository.validateApiKey).toHaveBeenCalledTimes(2);
    
    // Verify both validations completed successfully
    expect(result1.err).toBeUndefined();
    expect(result2.err).toBeUndefined();
    
    // Verify each request got the correct API key attached
    expect(result1.apiKey).toEqual({
      id: mockApiKey1.id,
      userId: mockApiKey1.userId,
      name: mockApiKey1.name
    });
    
    expect(result2.apiKey).toEqual({
      id: mockApiKey2.id,
      userId: mockApiKey2.userId,
      name: mockApiKey2.name
    });
  }, 10000); // Increased timeout for concurrent test

  it('should handle concurrent validation with rate limiting', async () => {
    // Arrange
    mockValidateApiKey.mockClear();
    
    // Setup mock to resolve after a delay to simulate processing
    mockValidateApiKey.mockImplementation(
      (params: { key: string }): Promise<ApiKeyValidationResult> => new Promise(resolve => 
        setTimeout(() => {
          if (params.key === 'rate-limited-key') {
            resolve({ isValid: true, key: createMockApiKey('rate-limited-key', 'user-1', 'Rate Limited Key') });
          } else {
            resolve({ isValid: false, error: 'Invalid API key' });
          }
        }, 50)
      )
    );
    
    const mockApiKey = createMockApiKey('rate-limited-key', 'user-1', 'Rate Limited Key');

    const numRequests = 5;
    const requests = Array(numRequests).fill(null).map(() => ({
      req: createMockRequest() as TestRequest,
      res: createMockResponse() as Response
    }));

    // Set the same API key for all requests
    requests.forEach(({ req }) => {
      req.headers.authorization = 'ApiKey test-key';
    });

    // Act - Run all validations concurrently
    const results = await Promise.all(
      requests.map(({ req, res }) => 
        new Promise<ValidationResult>((resolve) => {
          const next = (err?: Error) => resolve({ 
            err: err || undefined, 
            apiKey: (req as TestRequest).apiKey 
          });
          apiKeyAuth(testRepository)(req as Request, res as Response, next as NextFunction);
        })
      )
    ) as ValidationResult[];
    
    // Assert
    expect(testRepository.validateApiKey).toHaveBeenCalledTimes(numRequests);
    
    // All validations should complete successfully
    results.forEach((result) => {
      expect(result.err).toBeUndefined();
      expect(result.apiKey).toBeDefined();
      if (result.apiKey) {
        expect(result.apiKey).toMatchObject({
          id: mockApiKey.id,
          userId: mockApiKey.userId,
          name: mockApiKey.name
        });
      }
    });
  }, 10000); // Increased timeout for concurrent test
});
