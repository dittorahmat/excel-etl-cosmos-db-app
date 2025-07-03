import { vi, describe, it, expect, beforeEach, type MockInstance } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { apiKeyAuth } from '../src/middleware/apiKeyAuth.js';
import { ApiKeyRepository } from '@/repositories/apiKeyRepository.js';
import type { AzureCosmosDB } from '@/types/azure.js';
import { createTestApiKey, createMockRequest, createMockResponse, createNextFunction } from './apiKeyAuth.middleware.test-utils.js';
import type { TestRequest } from './apiKeyAuth.middleware.types.js';

// Extend Vitest types
declare module 'vitest' {
  interface MockInstance<T = any, P extends any[] = any> {
    mockImplementation: (fn: (...args: P) => T) => MockInstance<T, P>;
    mockResolvedValue: (value: T) => MockInstance<T, P>;
    mockRejectedValue: (value: any) => MockInstance<T, P>;
  }
}

// Mock the ApiKeyRepository
const mockValidateApiKey = vi.fn();
const MockApiKeyRepository = vi.fn().mockImplementation(() => ({
  validateApiKey: mockValidateApiKey,
  // Add other required methods with default mock implementations
  create: vi.fn(),
  findById: vi.fn(),
  delete: vi.fn(),
  listByUser: vi.fn(),
  revoke: vi.fn(),
  update: vi.fn()
}));

// Extend the Express types to include mock properties
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface NextFunction {
      mock: {
        calls: Array<Array<any>>;
        results: Array<{ type: string; value: any }>;
        instances: Array<any>;
        lastCall: Array<any> | null;
      };
      mockClear: () => void;
    }
  }
}

// Set up test environment
let req: TestRequest;
let res: Response;
let next: NextFunction & { mock: any; mockClear: () => void };
let testRepository: ApiKeyRepository;
let mockContainer: any;
let mockCosmosDb: AzureCosmosDB;

describe('API Key Authentication Middleware - Authentication Flow', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    
    mockContainer = {
      items: {
        query: vi.fn().mockReturnThis(),
        fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
        upsert: vi.fn().mockResolvedValue({ resource: {} }),
      },
      item: vi.fn().mockImplementation((id) => ({
        read: vi.fn().mockResolvedValue({ resource: { id } }),
        replace: vi.fn().mockResolvedValue({ resource: {} }),
        delete: vi.fn().mockResolvedValue({}),
      })),
    };

    // Mock Azure CosmosDB
    mockCosmosDb = {
      database: vi.fn().mockReturnThis(),
      container: vi.fn().mockImplementation(() => mockContainer),
      query: vi.fn().mockResolvedValue({ resources: [] }),
      upsertRecord: vi.fn().mockResolvedValue({}),
      getById: vi.fn().mockResolvedValue(null),
      deleteRecord: vi.fn().mockResolvedValue(true),
    } as unknown as AzureCosmosDB;

    // Setup default request, response, and next function
    req = createMockRequest() as TestRequest;
    res = createMockResponse() as Response;
    next = createNextFunction() as MockedFunction<NextFunction>;
    
    // Setup default mock implementation
    testRepository = new ApiKeyRepository(mockCosmosDb);
    vi.spyOn(testRepository, 'validateApiKey').mockImplementation(mockValidateApiKey);
  });

  it('should skip API key validation if user is already authenticated', async () => {
    // Arrange
    req.user = { id: 'authenticated-user' };
    req.headers.authorization = 'ApiKey test-key';
    
    // Act
    await apiKeyAuth(testRepository)(req as Request, res as Response, next);
    
    // Assert
    expect(mockValidateApiKey).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
    expect(next.mock.calls[0][0]).toBeUndefined(); // No error
  });

  it('should attach API key info to request when validation succeeds', async () => {
    // Arrange
    const testKey = 'test-api-key';
    const mockApiKey = createTestApiKey({
      id: 'test-key-123',
      userId: 'test-user',
      name: 'Test Key'
    });
    
    req.headers.authorization = `ApiKey ${testKey}`;
    mockValidateApiKey.mockResolvedValueOnce({
      isValid: true,
      key: mockApiKey
    });
    
    // Act
    await apiKeyAuth(testRepository)(req as Request, res as Response, next);
    
    // Assert
    expect(req.apiKey).toBeDefined();
    expect(req.apiKey).toEqual(expect.objectContaining({
      id: mockApiKey.id,
      userId: mockApiKey.userId,
      name: mockApiKey.name
    }));
    expect(next).toHaveBeenCalled();
  });

  it('should call next with error when API key validation fails', async () => {
    // Arrange
    const testKey = 'invalid-key';
    req.headers.authorization = `ApiKey ${testKey}`;
    
    mockValidateApiKey.mockResolvedValueOnce({
      isValid: false,
      key: null,
      error: 'Invalid API key'
    });
    
    // Act
    await apiKeyAuth(testRepository)(req as Request, res as Response, next);
    
    // Assert
    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      status: 401,
      message: 'Invalid API key'
    }));
    expect(req.apiKey).toBeUndefined();
  });

  it('should handle IP address restrictions', async () => {
    // Arrange
    const testKey = 'test-api-key';
    const allowedIp = '10.0.0.1';
    const mockApiKey = createTestApiKey({
      allowedIps: [allowedIp]
    });
    
    req.headers.authorization = `ApiKey ${testKey}`;
    req.ip = allowedIp;
    
    // Test with allowed IP
    mockValidateApiKey.mockResolvedValueOnce({
      isValid: true,
      key: mockApiKey
    });
    
    // Act & Assert - Should allow when IP matches
    await apiKeyAuth(testRepository)(req as Request, res as Response, next);
    expect(next).toHaveBeenCalled();
    expect(next.mock.calls[0][0]).toBeUndefined();
    
    // Reset mocks for next test
    next.mockClear();
    
    // Test with disallowed IP
    req.ip = '10.0.0.2';
    mockValidateApiKey.mockResolvedValueOnce({
      isValid: false,
      key: null,
      error: `IP address ${req.ip} not allowed`
    });
    
    await apiKeyAuth(testRepository)(req as Request, res as Response, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      status: 401,
      message: `IP address ${req.ip} not allowed`
    }));
  });
});
