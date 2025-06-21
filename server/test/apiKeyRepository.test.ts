import { describe, it, expect, vi, beforeEach, MockedFunction, beforeAll } from 'vitest';
import { ApiKeyRepository } from '../src/repositories/apiKeyRepository.js';
import { Container } from '@azure/cosmos';
import type { ApiKey } from '../src/types/apiKey.js';

// Define types for our mocks
type MockContainer = {
  items: {
    query: MockedFunction<any>;
    create: MockedFunction<any>;
    upsert: MockedFunction<any>;
  };
  item: MockedFunction<any>; // Add item directly to MockContainer
};

type MockItem = {
  read: MockedFunction<any>;
  delete: MockedFunction<any>;
  replace: MockedFunction<any>;
};

// Create a mock Cosmos container
const createMockContainer = (): MockContainer => {
  const mockItem: MockItem = {
    read: vi.fn().mockResolvedValue({ resource: null }),
    delete: vi.fn(),
    replace: vi.fn(),
  };

  const mockContainer: MockContainer = {
    items: {
      query: vi.fn().mockReturnThis(),
      create: vi.fn(),
      upsert: vi.fn().mockResolvedValue({ resource: {} }),
    },
    item: vi.fn().mockReturnValue(mockItem),
  };
  return mockContainer;
};

const mockCosmosContainer = createMockContainer();
const mockItem = mockCosmosContainer.item('test-id');

// Mock the AzureCosmosDB interface
const mockAzureCosmosDB = {
  container: vi.fn().mockImplementation(() => ({
    items: mockCosmosContainer.items,
    item: mockCosmosContainer.item,
  })),
};

// Mock the crypto module
vi.mock('crypto', async (importOriginal) => {
  const actual = await importOriginal() as typeof import('crypto');
  const randomBytes = vi.fn().mockImplementation((size: number, callback?: (err: Error | null, buf: Buffer) => void) => {
    const buf = Buffer.alloc(size, 'a'); // Return a buffer of 'a's for testing
    if (callback) {
      callback(null, buf);
    }
    return buf;
  });

  const createHash = vi.fn().mockImplementation(() => ({
    update: vi.fn().mockReturnThis(),
    digest: vi.fn().mockReturnValue('hashed-value'),
  }));

  const timingSafeEqual = vi.fn().mockImplementation((a: Buffer, b: Buffer) => {
    return a.length === b.length && a.every((val, i) => val === b[i]);
  });

  return {
    ...actual,
    randomBytes,
    createHash,
    timingSafeEqual,
  };
});


// Mock the Azure services
vi.mock('../src/config/azure-services.js', () => ({
  initializeAzureServices: vi.fn().mockResolvedValue({
    container: () => mockCosmosContainer,
  }),
  getCosmosDb: vi.fn().mockImplementation(() => ({
    container: () => mockCosmosContainer,
  })),
}));

describe('ApiKeyRepository', () => {
  let repository: ApiKeyRepository;
  const mockContainer = mockCosmosContainer;
  const mockUserId = 'user-123';

  beforeEach(async () => {
    vi.clearAllMocks();
    // Ensure the container mock is resolved before creating the repository
    await (mockAzureCosmosDB.container as MockedFunction<any>).mockResolvedValue(mockCosmosContainer);
    repository = new ApiKeyRepository(mockAzureCosmosDB as any);
  });

  beforeAll(async () => {
    // Mock the container method to return our mock container
    await (mockAzureCosmosDB.container as MockedFunction<any>).mockResolvedValue(mockContainer);
  });

  describe('createApiKey', () => {
    it('should create a new API key', async () => {
      const mockKey = {
        id: 'key-123',
        userId: mockUserId,
        keyHash: 'hashed-key',
        name: 'Test Key',
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      // Mock the container's upsert method
      (mockContainer.items.upsert as MockedFunction<any>).mockResolvedValueOnce({
        resource: mockKey,
      });

      const result = await repository.createApiKey(mockUserId, {
        name: 'Test Key',
      });

      expect(result).toBeDefined();
      expect(result.key).toBeDefined();
      expect(result.name).toBe('Test Key');
      expect(mockContainer.items.upsert).toHaveBeenCalled();

      // Verify the stored key is hashed
      const storedKey = (mockContainer.items.upsert as unknown as MockedFunction<any>).mock.calls[0][0] as ApiKey;
      expect(storedKey.keyHash).toBeDefined();
      expect(storedKey.keyHash).not.toBe((result as any).key); // Should store hash, not the actual key
    });
  });

  describe('update', () => {
    it('should update an existing API key', async () => {
      const mockKey: ApiKey = {
        id: 'key-123',
        userId: mockUserId,
        keyHash: 'hashed-key',
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
          name: 'Updated Key',
          updatedAt: new Date().toISOString()
        },
      });

      await repository.update({
        id: 'key-123',
        name: 'Updated Key',
      });

      expect(mockItem.read).toHaveBeenCalled();
      expect(mockContainer.items.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'key-123',
          name: 'Updated Key',
          updatedAt: expect.any(String),
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
        keyHash: 'hashed-key',
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

      const result = await (repository as any).revokeApiKey({
        keyId,
        
      });

      expect(result).toBe(true);
      expect(mockContainer.items.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: keyId,
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
      const keyHash = 'valid-hash';
      const mockKey = {
        id: 'key-123',
        
        keyHash,
        name: 'Test Key',
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      // Mock the query builder methods
      const mockQuery = {
        query: vi.fn().mockReturnThis(),
        parameters: vi.fn().mockReturnThis(),
        fetchAll: vi.fn().mockResolvedValue({ resources: [mockKey] }),
      };

      (mockContainer.items.query as any).mockReturnValue(mockQuery);

      // Mock the hash function to return our test hash

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
        
        keyHash: 'valid-hash',
        name: 'Test Key',
        isActive: true,
        allowedIps: [allowedIp],
        createdAt: new Date().toISOString(),
      };

      const mockQuery = {
        query: vi.fn().mockReturnThis(),
        parameters: vi.fn().mockReturnThis(),
        fetchAll: vi.fn().mockResolvedValue({ resources: [mockKey] }),
      };

      (mockContainer.items.query as any).mockReturnValue(mockQuery);

      // Test with allowed IP
      const validResult = await repository.validateApiKey({
        key: 'valid-key',
        
        ipAddress: allowedIp,
      });
      expect(validResult.isValid).toBe(true);

      // Test with disallowed IP
      const invalidResult = await repository.validateApiKey({
        key: 'invalid-key',
        
        ipAddress: '10.0.0.1',
      });
      expect(invalidResult.isValid).toBe(false);
    });
  });
});
