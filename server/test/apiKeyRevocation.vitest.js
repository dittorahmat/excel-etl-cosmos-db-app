import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ApiKeyRepository } from '../src/repositories/apiKeyRepository.js';
describe('API Key Revocation', () => {
    let apiKeyRepository;
    let mockContainer;
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
    beforeEach(() => {
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
        };
        apiKeyRepository = new ApiKeyRepository(mockCosmosDb);
    });
    describe('revokeApiKey', () => {
        it('should successfully revoke an active API key', async () => {
            // Arrange
            const params = {
                keyId: testKeyId,
                userId: testUserId,
            };
            // Mock the read operation to return an active key
            mockContainer.item.mockImplementation(() => ({
                read: vi.fn().mockResolvedValueOnce({
                    resource: { ...testKey, isActive: true }
                })
            }));
            // Mock the upsert to succeed
            mockContainer.upsert.mockResolvedValueOnce({ resource: { ...testKey, isActive: false } });
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
            const params = {
                keyId: 'non-existent-key',
                userId: testUserId,
            };
            // Mock the read operation to return no resource
            mockContainer.item.mockImplementation(() => ({
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
            const params = {
                keyId: testKeyId,
                userId: 'different-user',
            };
            // Mock the read operation to return a key owned by a different user
            mockContainer.item.mockImplementation(() => ({
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
            const params = {
                keyId: testKeyId,
                userId: testUserId,
            };
            // Mock the read operation to succeed
            mockContainer.item.mockImplementation(() => ({
                read: vi.fn().mockResolvedValueOnce({
                    resource: { ...testKey, isActive: true }
                })
            }));
            // Mock the upsert to throw an error
            const error = new Error('Database error');
            mockContainer.upsert.mockRejectedValueOnce(error);
            // Spy on console.error
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
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
            const params = {
                keyId: testKeyId,
                userId: testUserId,
            };
            // Mock the read operation to return an already revoked key
            mockContainer.item.mockImplementation(() => ({
                read: vi.fn().mockResolvedValueOnce({
                    resource: { ...testKey, isActive: false }
                })
            }));
            // Mock the upsert to succeed
            mockContainer.upsert.mockResolvedValueOnce({ resource: { ...testKey, isActive: false } });
            // Act
            const result = await apiKeyRepository.revokeApiKey(params);
            // Assert
            expect(result).toBe(true);
            expect(mockContainer.upsert).toHaveBeenCalledWith(expect.objectContaining({
                isActive: false,
            }));
        });
    });
});
