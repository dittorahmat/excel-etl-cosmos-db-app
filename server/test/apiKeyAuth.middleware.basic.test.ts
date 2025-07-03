import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
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

describe('API Key Authentication Middleware - Basic Validation', () => {
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
    
    // Add a default mock implementation for validateApiKey
    mockValidateApiKey.mockResolvedValue({
      isValid: true,
      key: createTestApiKey({ id: 'test-key-123' }),
    });
  });

  afterEach(() => {
    // Restore console methods if they were mocked
    vi.restoreAllMocks();
  });

  it('should call next with error if no API key is provided', async () => {
    // Arrange
    req.headers.authorization = undefined;
    
    // Act
    await apiKeyAuth(testRepository)(req as Request, res as Response, next);
    
    // Assert
    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      status: 401,
      message: 'API key is required'
    }));
  });

  it('should validate API key from Authorization header', async () => {
    // Arrange
    const testKey = 'test-api-key';
    req.headers.authorization = `ApiKey ${testKey}`;
    
    // Act
    await apiKeyAuth(testRepository)(req as Request, res as Response, next);
    
    // Assert
    expect(mockValidateApiKey).toHaveBeenCalledWith({
      key: testKey,
      ipAddress: '192.168.1.1'
    });
    expect(next).toHaveBeenCalled();
  });

  it('should validate API key from query parameter', async () => {
    // Arrange
    const testKey = 'test-api-key';
    req.query = { api_key: testKey };
    
    // Act
    await apiKeyAuth(testRepository)(req as Request, res as Response, next);
    
    // Assert
    expect(mockValidateApiKey).toHaveBeenCalledWith({
      key: testKey,
      ipAddress: '192.168.1.1'
    });
    expect(next).toHaveBeenCalled();
  });

  it('should prioritize Authorization header over query parameter', async () => {
    // Arrange
    const headerKey = 'header-key';
    const queryKey = 'query-key';
    req.headers.authorization = `ApiKey ${headerKey}`;
    req.query = { api_key: queryKey };
    
    // Act
    await apiKeyAuth(testRepository)(req as Request, res as Response, next);
    
    // Assert
    expect(mockValidateApiKey).toHaveBeenCalledWith({
      key: headerKey,
      ipAddress: '192.168.1.1'
    });
    expect(mockValidateApiKey).not.toHaveBeenCalledWith({
      key: queryKey,
      ipAddress: '192.168.1.1'
    });
  });
});

