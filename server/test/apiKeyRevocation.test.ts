import { describe, it, expect, beforeEach, vi, type Mock, type MockedFunction } from 'vitest';
import { ApiKeyRepository } from '../src/repositories/apiKeyRepository.js';
import type { RevokeApiKeyParams } from '../src/types/apiKey.js';

// Mock the logger to prevent console output during tests
vi.mock('../src/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock types for Cosmos DB container
type MockContainer = {
  item: Mock;
  read: Mock;
  upsert: Mock;
  items: {
    query: Mock;
    fetchAll: Mock;
    upsert: Mock;
  };
};

describe('API Key Revocation', () => {
  let apiKeyRepository: ApiKeyRepository;
  let mockContainer: MockContainer;
  
  const testUserId = 'user123';
  const testKeyId = 'key123';
  const testKey = {
    id: testKeyId,
    userId: testUserId,
    keyHash: 'hashed_key_value',
    name: 'Test Key',
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    // Create a fresh mock container for each test
    mockContainer = {
      item: vi.fn().mockImplementation((id, partitionKey) => ({
        read: vi.fn().mockResolvedValue({ 
          resource: { ...testKey, id, userId: partitionKey } 
        })
      })),
      read: vi.fn(),
      upsert: vi.fn().mockImplementation((item: any) => ({ 
        resource: { ...item } 
      })),
      items: {
        query: vi.fn().mockReturnThis(),
        fetchAll: vi.fn(),
        upsert: vi.fn().mockResolvedValue({ 
          resource: { ...testKey, isActive: false } 
        })
      },
    } as unknown as MockContainer;
    
    // Create a new instance of the repository for each test
    const mockCosmosDb = {
      container: vi.fn().mockImplementation(() => mockContainer),
    } as any;
    
    const mockAzureServices = {
      cosmosDb: mockCosmosDb,
      blobStorage: { /* mock blobStorage if needed, or leave empty if not used by ApiKeyRepository */ },
    };
    apiKeyRepository = new ApiKeyRepository(mockAzureServices);
  });

  describe('revokeApiKey', () => {
    it('should successfully revoke an active API key', async () => {
      // Arrange
      const params: RevokeApiKeyParams = {
        keyId: testKeyId,
        userId: testUserId,
      };
      
      // Setup mock for reading the key
      (mockContainer.item as Mock).mockImplementationOnce((id, partitionKey) => ({
        read: vi.fn().mockResolvedValueOnce({
          resource: { ...testKey, id, userId: partitionKey, isActive: true }
        })
      }));
      
      // Mock the upsert to simulate successful update
      (mockContainer.items.upsert as Mock).mockResolvedValueOnce({ 
        resource: { ...testKey, isActive: false } 
      });
      
      // Act
      const result = await apiKeyRepository.revokeApiKey(params);
      
      // Assert
      expect(result).toBe(true);
      expect(mockContainer.item).toHaveBeenCalledWith(testKeyId, testUserId);
      expect(mockContainer.items.upsert).toHaveBeenCalledWith(expect.objectContaining({
        id: testKeyId,
        userId: testUserId,
        isActive: false,
      }));
    });
    
    it('should return false when key is not found', async () => {
      // Arrange
      const params: RevokeApiKeyParams = {
        keyId: 'non-existent-key',
        userId: testUserId,
      };
      
      // Mock the read operation to return no resource (key not found)
      (mockContainer.item as Mock).mockImplementation(() => ({
        read: vi.fn().mockResolvedValueOnce({ resource: undefined })
      }));
      
      // Act
      const result = await apiKeyRepository.revokeApiKey(params);
      
      // Assert
      expect(result).toBe(false);
      expect(mockContainer.item).toHaveBeenCalledWith('non-existent-key', testUserId);
      expect(mockContainer.upsert).not.toHaveBeenCalled();
    });
    
    it('should return false when user does not own the key', async () => {
      // Arrange
      const params: RevokeApiKeyParams = {
        keyId: testKeyId,
        userId: 'different-user',
      };
      
      // Mock the read operation to return a key owned by a different user
      (mockContainer.item as Mock).mockImplementation(() => ({
        read: vi.fn().mockResolvedValueOnce({
          resource: { ...testKey, userId: 'different-owner' }
        })
      }));
      
      // Act
      const result = await apiKeyRepository.revokeApiKey(params);
      
      // Assert
      expect(result).toBe(false);
      expect(mockContainer.upsert).not.toHaveBeenCalled();
    });
    
    it('should handle errors during key revocation', async () => {
      // Arrange
      const params: RevokeApiKeyParams = {
        keyId: testKeyId,
        userId: testUserId,
      };
      
      // Mock the read operation to succeed but upsert to fail
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Mock the read operation to throw an error
      (mockContainer.item as Mock).mockImplementationOnce(() => ({
        read: vi.fn().mockRejectedValueOnce(new Error('Database error'))
      }));
      
      // Act
      const result = await apiKeyRepository.revokeApiKey(params);
      
      // Assert
      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to revoke API key:',
        expect.any(Error)
      );
      
      // Cleanup
      consoleErrorSpy.mockRestore();
    });
    
    it('should handle already revoked keys', async () => {
      // Arrange
      const params: RevokeApiKeyParams = {
        keyId: testKeyId,
        userId: testUserId,
      };
      
      // Mock the read operation to return an already revoked key
      (mockContainer.item as Mock).mockImplementationOnce((id, partitionKey) => ({
        read: vi.fn().mockResolvedValueOnce({
          resource: { ...testKey, id, userId: partitionKey, isActive: false }
        })
      }));
      
      // Mock the upsert to verify it's called with the correct parameters
      (mockContainer.items.upsert as Mock).mockResolvedValueOnce({ 
        resource: { ...testKey, isActive: false } 
      });
      
      // Act
      const result = await apiKeyRepository.revokeApiKey(params);
      
      // Assert
      expect(result).toBe(true); // Should still return true for idempotency
      expect(mockContainer.items.upsert).toHaveBeenCalledWith(expect.objectContaining({
        id: testKeyId,
        userId: testUserId,
        isActive: false,
      }));
    });
  });
});
