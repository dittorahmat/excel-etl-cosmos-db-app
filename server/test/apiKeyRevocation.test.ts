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
      item: vi.fn().mockReturnThis(),
      read: vi.fn(),
      upsert: vi.fn(),
      items: {
        query: vi.fn().mockReturnThis(),
        fetchAll: vi.fn(),
      },
    };
    
    // Create a new instance of the repository for each test
    const mockCosmosDb = {
      container: vi.fn().mockResolvedValue(mockContainer),
    } as any;
    
    apiKeyRepository = new ApiKeyRepository(mockCosmosDb);
    
    // Set up default mock implementations
    mockContainer.item.mockReturnThis();
    mockContainer.upsert.mockResolvedValue({ resource: testKey });
  });

  describe('revokeApiKey', () => {
    it('should successfully revoke an active API key', async () => {
      // Arrange
      const params: RevokeApiKeyParams = {
        keyId: testKeyId,
        userId: testUserId,
      };
      
      // Mock the read operation to return an active key
      (mockContainer.item as Mock).mockImplementation((id, partitionKey) => ({
        read: vi.fn().mockResolvedValueOnce({
          resource: { ...testKey, isActive: true }
        })
      }));
      
      // Act
      const result = await apiKeyRepository.revokeApiKey(params);
      
      // Assert
      expect(result).toBe(true);
      expect(mockContainer.item).toHaveBeenCalledWith(testKeyId, testUserId);
      expect(mockContainer.upsert).toHaveBeenCalledWith(expect.objectContaining({
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
      (mockContainer.item as Mock).mockImplementation(() => ({
        read: vi.fn().mockResolvedValueOnce({
          resource: { ...testKey, isActive: true }
        })
      }));
      
      // Mock the upsert to throw an error
      const error = new Error('Database error');
      mockContainer.upsert = vi.fn().mockRejectedValueOnce(error);
      
      // Spy on console.error to verify it's called
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Act
      const result = await apiKeyRepository.revokeApiKey(params);
      
      // Assert
      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to revoke API key:', error);
      
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
      (mockContainer.item as Mock).mockImplementation(() => ({
        read: vi.fn().mockResolvedValueOnce({
          resource: { ...testKey, isActive: false }
        })
      }));
      
      // Act
      const result = await apiKeyRepository.revokeApiKey(params);
      
      // Assert
      expect(result).toBe(true); // Should still return true as the key is effectively revoked
      expect(mockContainer.upsert).toHaveBeenCalledWith(expect.objectContaining({
        isActive: false,
      }));
    });
  });
});
