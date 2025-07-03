// @vitest-environment node
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { ApiKeyRepository } from '../src/repositories/apiKeyRepository.js';
import type { ApiKey } from '../src/types/apiKey.js';
import { generateApiKey, hashApiKey } from '../src/utils/apiKeyUtils.js';

// Mock the apiKeyUtils module
vi.mock('../src/utils/apiKeyUtils.js', () => ({
  generateApiKey: vi.fn(),
  hashApiKey: vi.fn()
}));

// Import test utilities after mocks are set up
import './test-utils';

// Mock types for Cosmos DB
interface MockContainer {
  items: {
    upsert: Mock;
    query: Mock;
    create: Mock;
    fetchAll: Mock;
    read: Mock;
    replace: Mock;
  };
  item: Mock;
}

// Mock API key data used in tests
const mockApiKey: ApiKey = {
  id: 'test-key-id',
  userId: 'test-user-id',
  keyHash: 'test-hash',
  name: 'Test Key',
  isActive: true,
  createdAt: new Date().toISOString(),
  allowedIps: ['*']
};

describe('ApiKeyRepository', () => {
  let repository: ApiKeyRepository;
  let mockCosmosClient: {
    container: Mock;
    database: (name: string) => any;
  };
  let mockContainer: MockContainer;
  const mockUserId = 'test-user-id';

  // Reset all mocks before each test
  beforeEach(() => {
    // Reset all mocks before each test
    vi.resetAllMocks();

    // Create a mock Cosmos DB client
    mockContainer = {
      items: {
        query: vi.fn().mockReturnThis(),
        create: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockResolvedValue({ resource: {} }),
        fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
        read: vi.fn(),
        replace: vi.fn()
      },
      item: vi.fn().mockImplementation(() => ({
        read: vi.fn().mockResolvedValue({ resource: mockApiKey }),
        replace: vi.fn().mockResolvedValue({ resource: { ...mockApiKey, isActive: false } })
      }))
    };

    mockCosmosClient = {
      container: vi.fn().mockReturnValue(mockContainer),
      database: vi.fn().mockReturnThis()
    };

    // Create a new instance of the repository for each test
    repository = new ApiKeyRepository(mockCosmosClient);
  });

  describe('createApiKey', () => {
    it('should create a new API key', async () => {
      // Define test variables
      const testApiKey = 'test-api-key';
            const testKeyHash = `hashed_${testApiKey}`;
      
      // Mock the API key generation and hashing
      vi.mocked(generateApiKey).mockResolvedValue(testApiKey);
      vi.mocked(hashApiKey).mockReturnValue(testKeyHash);
      
      // Set up the mock upsert implementation
      const mockUpsert = vi.fn().mockImplementation((item: ApiKey) => ({
        resource: { ...item, id: 'key-123' }
      }));
      
      // Update the mock container
      mockContainer.items.upsert = mockUpsert;

      // Create a new repository instance to ensure mocks are applied
      const testRepository = new ApiKeyRepository(mockCosmosClient);
      
      // Call the method under test
      const result = await testRepository.createApiKey(mockUserId, {
        name: 'Test Key',
      });

      // Assert the results
      expect(result).toBeDefined();
      expect(result.key).toBe(testApiKey);
      expect(result.name).toBe('Test Key');
      expect(mockUpsert).toHaveBeenCalled();

      // Verify the stored key is hashed
      const storedKey = mockUpsert.mock.calls[0][0] as ApiKey;
      expect(storedKey.keyHash).toBe(testKeyHash);
      expect(storedKey.keyHash).not.toBe(testApiKey); // Should store hash, not the actual key
    });
  });

  describe('update', () => {
    it('should update an existing API key', async () => {
      const mockKey: ApiKey = {
        id: 'key-123',
        userId: mockUserId,
        keyHash: 'mocked-hash-value',
        name: 'Test Key',
        isActive: true,
        createdAt: new Date().toISOString(),
        allowedIps: ['*']
      };
      
      // Mock the container's item read and upsert methods
      const mockRead = vi.fn().mockResolvedValue({ resource: mockKey });
      mockContainer.item = vi.fn().mockReturnValue({
        read: mockRead,
        replace: vi.fn().mockResolvedValue({ resource: { ...mockKey, name: 'Updated Key' } })
      });
      
      // Mock the upsert method on items
      mockContainer.items.upsert = vi.fn().mockResolvedValue({ resource: { ...mockKey, name: 'Updated Key' } });

      // Call the method under test
      await repository.update({
        id: 'key-123',
        name: 'Updated Key',
        isActive: true
      });
      
      // Verify the mocks were called correctly
      expect(mockRead).toHaveBeenCalled();
      expect(mockContainer.items.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Updated Key',
          isActive: true,
          updatedAt: expect.any(String)
        })
      );

      
    });
  });

  describe('revokeApiKey', () => {
    it('should revoke an existing API key', async () => {
      const keyId = 'key-123';
      const mockKey: ApiKey = {
        id: keyId,
        userId: mockUserId,
        keyHash: 'mocked-hash-value',
        name: 'Test Key',
        isActive: true,
        createdAt: new Date().toISOString(),
        allowedIps: ['*']
      };
      
      // Mock the container's item read and upsert methods
      const mockRead = vi.fn().mockResolvedValue({ resource: mockKey });
      mockContainer.item = vi.fn().mockReturnValue({
        read: mockRead,
        replace: vi.fn().mockResolvedValue({ resource: { ...mockKey, isActive: false } })
      });
      
      // Mock the upsert method on items
      mockContainer.items.upsert = vi.fn().mockResolvedValue({ resource: { ...mockKey, isActive: false } });

      // Call the method under test
      const result = await repository.revokeApiKey({
        keyId,
        userId: mockUserId
      });
      
      // Verify the result and mocks
      expect(result).toBe(true);
      expect(mockRead).toHaveBeenCalled();
      expect(mockContainer.items.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: false,
        })
      );

    });

  });

  describe('validateApiKey', () => {
    it('should validate a correct API key', async () => {
      const keyValue = 'valid-key';
      const hashedKey = `hashed-${keyValue}`;
      const mockKey: ApiKey = {
        id: 'key-123',
        userId: 'user-123',
        keyHash: hashedKey,
        name: 'Test Key',
        isActive: true,
        createdAt: new Date().toISOString(),
        allowedIps: ['192.168.1.1']
      };
      
      // Mock the hashApiKey function
      vi.mocked(hashApiKey).mockReturnValue(hashedKey);
      
      // Mock the container's query method
      const mockFetchAll = vi.fn().mockResolvedValue({
        resources: [mockKey]
      });
      
      mockContainer.items = {
        query: vi.fn().mockReturnValue({
          fetchAll: mockFetchAll
        }),
        upsert: vi.fn().mockResolvedValue({ resource: {} }), // Add upsert mock here
        create: vi.fn(),
        fetchAll: vi.fn(),
        read: vi.fn(),
        replace: vi.fn()
      };
      
      // Call the method under test
      const result = await repository.validateApiKey({
        key: keyValue,
        ipAddress: '192.168.1.1'
      });
      
      // Verify the result
      expect(result).toEqual({
        isValid: true,
        key: expect.objectContaining({
          id: 'key-123',
          name: 'Test Key',
          // Should not include keyHash in the response
        })
      });
    });
      
    
    it('should respect IP restrictions', async () => {
      const keyValue = 'valid-key';
      const hashedKey = `hashed-${keyValue}`;
      const allowedIp = '192.168.1.1';
      const mockKey = {
        id: 'key-123',
        keyHash: hashedKey,
        isActive: true,
        userId: mockUserId,
        name: 'Test Key',
        createdAt: new Date().toISOString(),
        expiresAt: null,
        allowedIps: [allowedIp]
      };
      
      // Mock the container query to return our mock key
      mockContainer.items.query.mockImplementation(() => ({
        fetchAll: vi.fn().mockResolvedValue({ resources: [mockKey] })
      }));
      
      // Test with allowed IP
      const validResult = await repository.validateApiKey({
        key: keyValue,
        ipAddress: allowedIp
      });
      expect(validResult.isValid).toBe(true);
      
      // Test with disallowed IP
      const invalidResult = await repository.validateApiKey({
        key: keyValue,
        ipAddress: '10.0.0.1'
      });
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.error).toContain('not allowed');
    });
  });
});