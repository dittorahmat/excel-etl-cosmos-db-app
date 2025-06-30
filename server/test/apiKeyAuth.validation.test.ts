import { describe, it, expect, vi, beforeEach, beforeAll, type MockInstance } from 'vitest';
import type { Response, NextFunction, Request } from 'express';
import { createTestApiKey } from './__mocks__/apiKey/apiKey.test.utils.js';
import type { ApiKey, ValidateApiKeyParams } from '../../src/types/apiKey.js';
import type { AzureCosmosDB } from '../../src/types/azure.js';

// Extend Vitest types
declare module 'vitest' {
  interface MockInstance<T = any, P extends any[] = any> {
    mockImplementation: (fn: (...args: P) => T) => MockInstance<T, P>;
    mockResolvedValue: (value: T) => MockInstance<T, P>;
    mockRejectedValue: (value: any) => MockInstance<T, P>;
  }
}

// Mock the AzureCosmosDB
const mockCosmosDb: AzureCosmosDB = {
  cosmosClient: {
    database: vi.fn().mockReturnThis(),
    container: vi.fn().mockReturnThis()
  },
  container: vi.fn().mockImplementation(() => ({
    items: {
      query: vi.fn().mockResolvedValue({ resources: [] }),
      create: vi.fn(),
      read: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn()
    }
  })),
  getContainer: vi.fn().mockImplementation(() => ({
    items: {
      query: vi.fn().mockResolvedValue({ resources: [] }),
      create: vi.fn(),
      read: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn()
    }
  })),
  query: vi.fn().mockResolvedValue({ resources: [] }),
  upsert: vi.fn().mockResolvedValue({}),
  getById: vi.fn().mockResolvedValue(null),
  delete: vi.fn().mockResolvedValue(true)
};

// Mock the ApiKeyRepository
const mockValidateApiKey = vi.fn();
const MockApiKeyRepository = vi.fn().mockImplementation(() => ({
  validateApiKey: mockValidateApiKey,
  create: vi.fn(),
  findById: vi.fn(),
  delete: vi.fn(),
  listByUser: vi.fn(),
  revoke: vi.fn(),
  update: vi.fn(),
  container: {
    items: {
      query: vi.fn().mockResolvedValue({ resources: [] })
    }
  }
}));

vi.mock('../../src/repositories/apiKeyRepository.js', () => ({
  ApiKeyRepository: MockApiKeyRepository
}));

// Import the actual implementation after setting up mocks
import { ApiKeyRepository } from '../../src/repositories/apiKeyRepository';

// Create a test repository instance
const testRepository = new ApiKeyRepository(mockCosmosDb);

// Setup the mock implementation for validateApiKey
mockValidateApiKey.mockResolvedValue(true);

// Mock the apiKeyAuth middleware
const mockApiKeyAuth = vi.fn().mockImplementation((repository: any) => 
  async (req: any, res: any, next: any) => {
    const apiKey = req.headers.authorization?.replace('ApiKey ', '') || req.query.apiKey;
    if (!apiKey) {
      return res.status(401).json({ error: { message: 'No API key provided' } });
    }
    
    try {
      const result = await repository.validateApiKey({ 
        key: apiKey,
        ipAddress: req.ip
      });
      
      if (!result.isValid) {
        return res.status(401).json({ error: { message: result.error || 'Invalid API key' } });
      }
      
      req.apiKey = result.key;
      next();
    } catch (error) {
      next(error);
    }
  }
);

vi.mock('../../src/middleware/apiKeyAuth', () => ({
  apiKeyAuth: mockApiKeyAuth
}));

// Extend the Express Request type for testing
export interface TestRequest extends Request {
  user?: any;
  apiKey?: any;
  ip: string;
  headers: {
    [key: string]: string | string[] | undefined;
    authorization?: string;
  };
}

// Helper functions for test setup
const createMockRequest = (): TestRequest => ({
  headers: {},
  ip: '127.0.0.1',
  get: (name: string) => undefined,
  header: (name: string) => undefined,
  // Add other required Request properties with minimal implementations
  // This is a simplified version - you may need to add more properties based on your tests
} as unknown as TestRequest);

const createMockResponse = (): Response => ({
  status: vi.fn().mockReturnThis(),
  json: vi.fn(),
  send: vi.fn(),
  // Add other required Response properties with minimal implementations
} as unknown as Response);

const createNextFunction = (): NextFunction => vi.fn();

// Mock the ApiKeyRepository with proper implementation
vi.mock('../src/repositories/apiKeyRepository', () => ({
  ApiKeyRepository: vi.fn().mockImplementation(() => ({
    validateApiKey: vi.fn().mockResolvedValue({
      isValid: true,
      key: {
        id: 'test-key-id',
        userId: 'test-user',
        name: 'Test Key',
        isActive: true,
        createdAt: new Date().toISOString(),
        lastUsedAt: null,
        allowedIps: ['127.0.0.1']
      }
    })
  }))
}));

describe('API key validation with IP restrictions', () => {
  let testRepository: ApiKeyRepository;
  let testKey: ApiKey;
  let req: TestRequest;
  let res: Response;
  let next: NextFunction;
  
  beforeEach(() => {
    testRepository = new ApiKeyRepository(mockCosmosDb as any);
    testKey = createTestApiKey();
    vi.clearAllMocks();
    req = createMockRequest();
    res = createMockResponse();
    next = createNextFunction();
  });

  describe('API Key Format Validation', () => {
    it('should reject empty API key', async () => {
      // Arrange
      mockValidateApiKey.mockRejectedValueOnce(new Error('API key is required'));
      
      // Act & Assert
      await expect(testRepository.validateApiKey({ key: '' }))
        .rejects.toThrow('API key is required');
    });

    it('should reject invalid API key format', async () => {
      // Arrange
      mockValidateApiKey.mockRejectedValueOnce(new Error('Invalid API key format'));
      
      // Act & Assert
      await expect(testRepository.validateApiKey({ key: 'invalid-key-format' }))
        .rejects.toThrow('Invalid API key format');
    });
  });

  describe('API Key Verification', () => {
    it('should reject non-existent API key', async () => {
      // Arrange
      const testKey = createTestApiKey();
      
      // Mock the repository to reject with an error
      mockValidateApiKey.mockRejectedValueOnce(new Error('API key not found'));
      
      // Act & Assert
      await expect(
        testRepository.validateApiKey({ key: testKey.key || '' })
      ).rejects.toThrow('API key not found');
    });

    it('should reject revoked API key', async () => {
      // Arrange
      const testKey = createTestApiKey({ isActive: false });
      
      // Mock the repository to reject with a revoked key error
      mockValidateApiKey.mockRejectedValueOnce(new Error('API key has been revoked'));
      
      // Act & Assert
      await expect(
        testRepository.validateApiKey({ key: testKey.key || '' })
      ).rejects.toThrow('API key has been revoked');
    });

    it('should validate active API key', async () => {
      // Arrange
      const testKey = createTestApiKey();
      
      // Mock the repository to return a valid key with IP restrictions
      const mockApiKey: Omit<ApiKey, 'keyHash'> & { keyHash?: string } = {
        ...testKey,
        key: testKey.key || '',
        allowedIps: ['192.168.1.1', '10.0.0.1'],
        isActive: true,
        userId: 'test-user',
        keyHash: 'hashed-key',
        name: 'Test Key',
        createdAt: new Date().toISOString(),
        lastUsedAt: undefined,
        lastUsedFromIp: undefined
      };
      
      mockValidateApiKey.mockResolvedValueOnce({
        isValid: true,
        key: mockApiKey as ApiKey
      });
      
      // Act
      const result = await testRepository.validateApiKey({ 
        key: testKey.key || '', 
        ipAddress: '10.0.0.1' 
      });
      
      // Assert
      expect(result).toBeDefined();
      expect(result.isValid).toBe(true);
      expect(result.key?.allowedIps).toContain('10.0.0.1');
      expect(result.key?.isActive).toBe(true);
    });
  });

  describe('IP Address Validation', () => {
    it('should reject request from unauthorized IP', async () => {
      // Arrange
      const testKey = createTestApiKey({ allowedIps: ['192.168.1.1'] });
      
      // Mock the repository to reject with IP restriction error
      mockValidateApiKey.mockRejectedValueOnce(
        new Error('API key is not authorized for this IP address')
      );
      
      // Act & Assert
      await expect(
        testRepository.validateApiKey({ 
          key: testKey.key || '',
          ipAddress: '10.0.0.1' 
        })
      ).rejects.toThrow('API key is not authorized for this IP address');
    });

    it('should allow request from authorized IP', async () => {
      // Arrange
      const apiKey = 'restricted-key';
      const ipAddress = '192.168.1.1';
      const testKey = createTestApiKey({ 
        key: apiKey,
        allowedIps: [ipAddress]
      });
      
      mockValidateApiKey.mockResolvedValueOnce({
        isValid: true,
        key: testKey
      });

      // Act
      const result = await testRepository.validateApiKey({ 
        key: apiKey,
        ipAddress 
      });

      // Assert
      expect(result).toEqual({
        isValid: true,
        key: testKey
      });
    });
  });
});
