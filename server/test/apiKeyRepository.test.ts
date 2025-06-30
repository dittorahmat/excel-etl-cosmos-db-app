// Import the crypto mock from test-utils
import { vi } from 'vitest';

// Use the crypto mock from test-utils
import './test-utils';

import { describe, it, expect, beforeEach, beforeAll, afterEach } from 'vitest';
import type { MockedFunction } from 'vitest';
import { ApiKeyRepository } from '../src/repositories/apiKeyRepository.js';
import { Container } from '@azure/cosmos';
import type { ApiKey } from '../src/types/apiKey.js';

// Define types for our mocks
type MockContainer = {
  items: {
    query: MockedFunction<any>;
    create: MockedFunction<any>;
    upsert: MockedFunction<any>;
    fetchAll: MockedFunction<any>;
  };
  item: MockedFunction<any>;
};

// Define the mock item type
interface MockItem {
  read: MockedFunction<any>;
  delete: MockedFunction<any>;
  replace: MockedFunction<any>;
}

const mockItem: MockItem = {
  read: vi.fn().mockResolvedValue({
    resource: { id: 'test-id', keyHash: 'mocked-hash-value', isActive: true }
  }),
  delete: vi.fn(),
  replace: vi.fn(),
};

// Define the mock implementation for the container
const createMockContainer = () => ({
  items: {
    query: vi.fn().mockReturnThis(),
    fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
    create: vi.fn(),
    upsert: vi.fn().mockImplementation((item) => ({
      resource: { ...item, _etag: 'mock-etag', _ts: Date.now() / 1000 }
    }))
  },
  item: vi.fn().mockImplementation((id) => ({
    read: vi.fn().mockResolvedValue({
      resource: { id, keyHash: 'mocked-hash-value', isActive: true }
    })
  }))
});

// Create the mock container
const mockContainer = createMockContainer();

// Import the actual AzureCosmosDB type to ensure our mock matches
import type { AzureCosmosDB } from '../src/types/azure.js';
import { CosmosClient } from '@azure/cosmos';

// Create a minimal mock for CosmosClient with only the methods we need
const mockCosmosClient = {
  database: vi.fn().mockReturnThis(),
  databases: {
    createIfNotExists: vi.fn(),
    query: vi.fn(),
    readAll: vi.fn()
  },
  // Add any other required CosmosClient methods as needed
  // We're not spreading the actual CosmosClient instance to avoid type conflicts
  // and only including the methods we actually need for testing
  getDatabaseAccount: vi.fn(),
  getWriteEndpoint: vi.fn(),
  getReadEndpoint: vi.fn()
};

// Mock the AzureCosmosDB interface
const mockAzureCosmosDB: AzureCosmosDB = {
  // Container method
  container: vi.fn().mockImplementation(() => mockContainer),
  
  // Database method
  database: vi.fn().mockReturnThis(),
  
  // Core methods
  query: vi.fn().mockImplementation(async (query: string, parameters?: any[]) => {
    return { resources: [] };
  }),
  upsertRecord: vi.fn().mockImplementation(async (item: any) => item),
  getById: vi.fn().mockImplementation(async (id: string) => ({
    id,
    keyHash: 'mocked-hash-value',
    isActive: true
  })),
  deleteRecord: vi.fn().mockResolvedValue(true),
  
  // Cosmos client - using type assertion to match the expected interface
  cosmosClient: {
    database: vi.fn().mockImplementation((name: string) => ({
      container: vi.fn().mockImplementation((containerName: string) => ({
        items: {
          query: vi.fn().mockReturnThis(),
          readAll: vi.fn().mockResolvedValue({ resources: [] }),
          create: vi.fn(),
          upsert: vi.fn()
        },
        item: vi.fn().mockImplementation((id: string) => ({
          read: vi.fn().mockResolvedValue({
            resource: { id, keyHash: 'mocked-hash-value', isActive: true }
          })
        }))
      }))
    }))
  } as unknown as CosmosClient
} as unknown as AzureCosmosDB;

// Crypto mock is now at the top of the file

// Mock the apiKeyUtils module
vi.mock('../src/utils/apiKeyUtils.js', () => ({
  generateApiKey: vi.fn().mockResolvedValue('test-api-key'),
  hashApiKey: vi.fn().mockImplementation((key) => `hashed-${key}`),
  safeCompareKeys: vi.fn().mockImplementation((a: string, b: string) => a === b),
  isValidApiKeyFormat: vi.fn().mockReturnValue(true),
  generateApiKeyId: vi.fn().mockReturnValue('key-123')
}));

// Mock the Azure services
vi.mock('../src/config/azure-services.js', () => ({
  initializeAzureServices: vi.fn().mockResolvedValue(mockAzureCosmosDB),
  getCosmosDb: vi.fn().mockReturnValue(mockAzureCosmosDB),
  getContainer: vi.fn().mockReturnValue(mockContainer)
}));

describe('ApiKeyRepository', () => {
  let repository: ApiKeyRepository;
  const mockUserId = 'user-123';
  
  // Reset all mocks before each test
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset the container mock
    mockContainer.items.query.mockClear();
    mockContainer.items.create.mockClear();
    mockContainer.items.upsert.mockClear();
    
    // Reset the item mock
    mockItem.read.mockClear();
    
    // Reset the AzureCosmosDB mocks
    (mockAzureCosmosDB.container as any).mockClear();
    (mockAzureCosmosDB.database as any).mockClear();
    (mockAzureCosmosDB.upsertRecord as any).mockClear();
    (mockAzureCosmosDB.query as any).mockClear();
    (mockAzureCosmosDB.getById as any).mockClear();
    (mockAzureCosmosDB.deleteRecord as any).mockClear();
    
    // Create a new instance of the repository for each test
    repository = new ApiKeyRepository(mockAzureCosmosDB);
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    // Ensure the container mock is resolved before creating the repository
    await (mockAzureCosmosDB.container as MockedFunction<any>).mockResolvedValue(mockContainer);
    repository = new ApiKeyRepository(mockAzureCosmosDB as any);
  });

  beforeAll(async () => {
    // Mock the container method to return our mock container
    await (mockAzureCosmosDB.container as MockedFunction<any>).mockResolvedValue(mockContainer);
  });

  describe('createApiKey', () => {
    it('should create a new API key', async () => {
      // Define test variables
      const testApiKey = 'test-api-key';
      const testKeyHash = `hashed-${testApiKey}`;
      
      // Mock the apiKeyUtils module to use our test key
      vi.mock('../src/utils/apiKeyUtils.js', () => ({
        generateApiKey: vi.fn().mockResolvedValue(testApiKey),
        hashApiKey: vi.fn().mockImplementation((key: string) => {
          if (!key) throw new Error('API key is required for hashing');
          return Promise.resolve(`hashed-${key}`);
        }),
        safeCompareKeys: vi.fn().mockResolvedValue(true)
      }));
      
      // Mock the crypto module
      vi.mock('crypto', () => ({
        randomBytes: vi.fn().mockReturnValue(Buffer.from('test-bytes')),
        createHash: vi.fn().mockReturnValue({
          update: vi.fn().mockReturnThis(),
          digest: vi.fn().mockReturnValue(testKeyHash)
        })
      }));
      
      // Re-import the modules to apply the mocks
      const { generateApiKey, hashApiKey } = await import('../src/utils/apiKeyUtils.js');
      
      // Mock the container's upsert method with proper typing
      (mockContainer.items.upsert as MockedFunction<any>).mockImplementationOnce((item: any) => {
        const resource = {
          ...item as Record<string, any>,
          id: 'key-123'
        };
        return { resource };
      });

      // Create a new repository instance to ensure mocks are applied
      const testRepository = new ApiKeyRepository(mockAzureCosmosDB as unknown as AzureCosmosDB);
      
      // Call the method under test
      const result = await testRepository.createApiKey(mockUserId, {
        name: 'Test Key',
      });

      // Assert the results
      expect(result).toBeDefined();
      expect(result.key).toBe(testApiKey);
      expect(result.name).toBe('Test Key');
      expect(mockContainer.items.upsert).toHaveBeenCalled();

      // Verify the stored key is hashed
      const storedKey = (mockContainer.items.upsert as unknown as MockedFunction<any>).mock.calls[0][0] as ApiKey;
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
      };

      // Create a new mock item for this test
      const testMockItem = {
        read: vi.fn().mockResolvedValueOnce({
          resource: { ...mockKey }
        })
      };

      // Mock the container's item method to return our test mock item
      (mockContainer.item as MockedFunction<any>).mockImplementationOnce((id) => testMockItem);

      // Mock the upsert
      (mockContainer.items.upsert as MockedFunction<any>).mockResolvedValueOnce({
        resource: {
          ...mockKey,
          name: 'Updated Key',
          updatedAt: new Date().toISOString()
        },
      });

      await repository.update({
        id: 'key-123',
        name: 'Updated Key',
      });

      // Verify the item's read method was called with the correct ID
      expect(testMockItem.read).toHaveBeenCalled();
      
      // Verify the upsert was called with the updated key
      expect(mockContainer.items.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'key-123',
          name: 'Updated Key',
          updatedAt: expect.any(String),
        })
      );
      
      // Verify the container's item method was called with the correct ID
      expect(mockContainer.item).toHaveBeenCalledWith('key-123', 'key-123');
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
      };

      // Mock the item read
      (mockItem.read as MockedFunction<any>).mockResolvedValueOnce({
        resource: mockKey,
      });

      // Mock the upsert
      (mockContainer.items.upsert as MockedFunction<any>).mockResolvedValueOnce({
        resource: {
          ...mockKey,
          isActive: false,
        },
      });

      // Mock the container's item method to return our mock item
      (mockContainer.item as MockedFunction<any>).mockImplementation((id, partitionKey) => ({
        ...mockItem,
        read: vi.fn().mockResolvedValueOnce({
          resource: { ...mockKey, id, userId: partitionKey }
        })
      }));

      const result = await repository.revokeApiKey({
        keyId,
        userId: mockUserId,
      });

      expect(result).toBe(true);
      expect(mockContainer.items.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: false,
        })
      );
    });

    it('should return false for non-existent key', async () => {
      (mockItem.read as MockedFunction<any>).mockResolvedValueOnce({
        resource: null,
      });

      const result = await (repository as any).revokeApiKey({
        keyId: 'non-existent',
        
      });

      expect(result).toBe(false);
    });
  });

  describe('listApiKeys', () => {
    it('should list all API keys for a user', async () => {
      const mockKeys = [
        {
          id: 'key-1',
          
          keyHash: 'hash-1',
          name: 'Key 1',
          isActive: true,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'key-2',
          
          keyHash: 'hash-2',
          name: 'Key 2',
          isActive: false,
          createdAt: new Date().toISOString(),
        },
      ];

      // Mock the query builder methods
      const mockQuery = {
        query: vi.fn().mockReturnThis(),
        parameters: vi.fn().mockReturnThis(),
        fetchAll: vi.fn().mockResolvedValue({ resources: mockKeys }),
      };

      (mockContainer.items.query as any).mockReturnValue(mockQuery);

      const result = await repository.listApiKeys(mockUserId);

      expect(result).toBeDefined();
      expect(result.keys).toHaveLength(2);
      expect(result.keys[0].keyHash).toBeUndefined(); // Should not return hashes
      expect(mockContainer.items.query).toHaveBeenCalledWith({
        query: 'SELECT * FROM c WHERE c.userId = @userId',
        parameters: [{ name: '@userId', value: mockUserId }],
      });
    });
  });

  describe('validateApiKey', () => {
    it('should validate a correct API key', async () => {
      const keyValue = 'valid-key';
      const hashedKey = `hashed-${keyValue}`;
      const mockKey = {
        id: 'key-123',
        keyHash: hashedKey,
        isActive: true,
        userId: mockUserId,
        name: 'Test Key',
        createdAt: new Date().toISOString(),
        expiresAt: null,
        allowedIps: []
      };
      
      // Mock the container query to return our mock key
      mockContainer.items.query.mockImplementation(() => ({
        fetchAll: vi.fn().mockResolvedValue({ resources: [mockKey] })
      }));
      
      // Mock the item read to return our mock key
      mockItem.read.mockResolvedValue({ resource: mockKey });
      
      // Call the method
      const result = await repository.validateApiKey({ key: keyValue });
      
      // Assert the result
      expect(result).toBeDefined();
      expect(result.isValid).toBe(true);
      expect(result.key).toBeDefined();
      expect(result.key?.id).toBe(mockKey.id);
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
  
  describe('createApiKey', () => {
    it('should create a new API key', async () => {
      const keyValue = 'test-api-key';
      const hashedKey = `hashed-${keyValue}`;
      const mockKey: ApiKey = {
        id: 'key-123',
        keyHash: 'mocked-hash-value',
        name: 'Test Key',
        isActive: true,
        createdAt: new Date().toISOString(),
        userId: mockUserId,
      };

      // Mock the query to return our test key
      (mockContainer.items.query as any).mockImplementation(() => ({
        query: vi.fn().mockReturnThis(),
        parameters: vi.fn().mockReturnThis(),
        fetchAll: vi.fn().mockResolvedValue({ resources: [mockKey] })
      }));

      // Mock the hashApiKey function to return a known value
      const { hashApiKey } = await import('../src/utils/apiKeyUtils.js');
      (hashApiKey as any).mockReturnValue('mocked-hash-value');

      const result = await repository.validateApiKey({
        key: keyValue,
      });

      expect(result).toBeDefined();
      expect(result.isValid).toBe(true);
      expect(result.key).toBeDefined();
      expect(result.key?.id).toBe(mockKey.id);
    });

    it('should reject invalid API keys', async () => {
      const mockQuery = {
        query: vi.fn().mockReturnThis(),
        parameters: vi.fn().mockReturnThis(),
        fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
      };

      (mockContainer.items.query as any).mockReturnValue(mockQuery);

      const result = await repository.validateApiKey({
        key: 'invalid-key',
        
      });

      expect(result.isValid).toBe(false);
      expect(result.key).toBeUndefined();
    });

    it('should respect IP restrictions', async () => {
      const allowedIp = '192.168.1.1';
      const mockKey = {
        id: 'key-123',
        keyHash: 'mocked-hash-value',
        name: 'Test Key',
        isActive: true,
        allowedIps: [allowedIp],
        createdAt: new Date().toISOString(),
        userId: mockUserId,
      };

      // Mock the query to return our test key
      (mockContainer.items.query as any).mockImplementation(() => ({
        query: vi.fn().mockReturnThis(),
        parameters: vi.fn().mockReturnThis(),
        fetchAll: vi.fn().mockResolvedValue({ resources: [mockKey] })
      }));

      // Mock the hashApiKey function to return a known value
      const { hashApiKey } = await import('../src/utils/apiKeyUtils.js');
      (hashApiKey as any).mockReturnValue('mocked-hash-value');

      // Test with allowed IP
      const validResult = await repository.validateApiKey({
        key: 'valid-key',
        ipAddress: allowedIp,
      });
      expect(validResult.isValid).toBe(true);

      // Test with disallowed IP
      const invalidResult = await repository.validateApiKey({
        key: 'valid-key',
        ipAddress: '10.0.0.1',
      });
      expect(invalidResult.isValid).toBe(false);
    });
  });
});
