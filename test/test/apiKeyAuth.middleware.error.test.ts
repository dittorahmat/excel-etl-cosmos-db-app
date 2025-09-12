import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { apiKeyAuth } from '../src/middleware/apiKeyAuth.js';
import { ApiKeyRepository } from '@/repositories/apiKeyRepository.js';
import type { AzureCosmosDB } from '@/types/azure.js';
import { createTestApiKey, createMockRequest, createMockResponse, createNextFunction } from './apiKeyAuth.middleware.test-utils.js';
import type { TestRequest } from './apiKeyAuth.middleware.types.js';

// Mock the ApiKeyRepository
const mockValidateApiKey = vi.fn();

// Set up test environment
let req: TestRequest;
let res: Response;
let next: NextFunction;
let testRepository: ApiKeyRepository;
let mockContainer: any;
let mockCosmosDb: AzureCosmosDB;

describe('API Key Authentication Middleware - Error Handling', () => {
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
    next = createNextFunction();
    
    // Setup default mock implementation
    testRepository = new ApiKeyRepository(mockCosmosDb);
    vi.spyOn(testRepository, 'validateApiKey').mockImplementation(mockValidateApiKey);
  });

  it('should handle repository validation errors', async () => {
    // Arrange
    const testKey = 'test-key';
    req.headers.authorization = `ApiKey ${testKey}`;
    
    const validationError = new Error('Validation failed');
    mockValidateApiKey.mockRejectedValueOnce(validationError);
    
    // Spy on console.error to verify error logging
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Act
    await apiKeyAuth(testRepository)(req as Request, res as Response, next);
    
    // Assert
    expect(consoleSpy).toHaveBeenCalledWith(
      'API key validation error',
      expect.any(Error)
    );
    
    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      status: 500,
      message: 'Failed to validate API key',
      originalError: validationError
    }));
    
    consoleSpy.mockRestore();
  });

  it('should handle invalid API key format in header', async () => {
    // Arrange
    req.headers.authorization = 'InvalidFormat';
    
    // Act
    await apiKeyAuth(testRepository)(req as Request, res as Response, next);
    
    // Assert
    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      status: 401,
      message: 'API key is required'
    }));
    expect(mockValidateApiKey).not.toHaveBeenCalled();
  });

  it('should handle empty API key in header', async () => {
    // Arrange
    req.headers.authorization = 'ApiKey '; // Note the space after ApiKey
    
    // Act
    await apiKeyAuth(testRepository)(req as Request, res as Response, next);
    
    // Assert
    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      status: 401,
      message: 'API key is required'
    }));
    expect(mockValidateApiKey).not.toHaveBeenCalled();
  });

  it('should handle invalid API key in query parameter', async () => {
    // Arrange
    req.query = { api_key: '' }; // Empty key
    
    // Act
    await apiKeyAuth(testRepository)(req as Request, res as Response, next);
    
    // Assert
    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      status: 401,
      message: 'API key is required'
    }));
    expect(mockValidateApiKey).not.toHaveBeenCalled();
  });

  it('should handle expired API key', async () => {
    // Arrange
    const testKey = 'expired-key';
    req.headers.authorization = `ApiKey ${testKey}`;
    
    const expiredDate = new Date();
    expiredDate.setDate(expiredDate.getDate() - 1);
    
    mockValidateApiKey.mockResolvedValueOnce({
      isValid: false,
      key: createTestApiKey({
        expiresAt: expiredDate.toISOString()
      }),
      error: 'API key has expired'
    });
    
    // Act
    await apiKeyAuth(testRepository)(req as Request, res as Response, next);
    
    // Assert
    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      status: 401,
      message: 'API key has expired'
    }));
  });

  it('should handle inactive API key', async () => {
    // Arrange
    const testKey = 'inactive-key';
    req.headers.authorization = `ApiKey ${testKey}`;
    
    mockValidateApiKey.mockResolvedValueOnce({
      isValid: false,
      key: createTestApiKey({
        isActive: false
      }),
      error: 'API key is not active'
    });
    
    // Act
    await apiKeyAuth(testRepository)(req as Request, res as Response, next);
    
    // Assert
    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      status: 401,
      message: 'API key is not active'
    }));
  });
});
