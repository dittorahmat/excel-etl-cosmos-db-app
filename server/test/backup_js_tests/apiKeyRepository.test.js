import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiKeyRepository } from '../src/repositories/apiKeyRepository';
import { mockCosmosContainer } from './test-utils';
// Mock the Cosmos DB container
vi.mock('../src/config/azure', () => ({
    initializeAzureServices: vi.fn().mockResolvedValue({
        container: () => mockCosmosContainer,
    }),
}));
describe('ApiKeyRepository', () => {
    let repository;
    const mockContainer = mockCosmosContainer;
    const mockUserId = 'user-123';
    beforeEach(() => {
        vi.clearAllMocks();
        repository = new ApiKeyRepository({
            container: () => mockContainer,
        });
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
            mockContainer.items.upsert.mockResolvedValueOnce({
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
            const storedKey = mockContainer.items.upsert.mock.calls[0][0];
            expect(storedKey.keyHash).toBeDefined();
            expect(storedKey.keyHash).not.toBe(result.key); // Should store hash, not the actual key
        });
    });
    describe('revokeApiKey', () => {
        it('should revoke an existing API key', async () => {
            const keyId = 'key-123';
            const mockKey = {
                id: keyId,
                userId: mockUserId,
                keyHash: 'hashed-key',
                name: 'Test Key',
                isActive: true,
                createdAt: new Date().toISOString(),
            };
            // Mock the container's item().read() method
            mockContainer.item.mockImplementation((id) => ({
                read: vi.fn().mockResolvedValue({ resource: mockKey }),
            }));
            // Mock the container's upsert method
            mockContainer.items.upsert.mockResolvedValueOnce({
                resource: { ...mockKey, isActive: false },
            });
            const result = await repository.revokeApiKey({
                keyId,
                userId: mockUserId,
            });
            expect(result).toBe(true);
            expect(mockContainer.items.upsert).toHaveBeenCalledWith({
                ...mockKey,
                isActive: false,
            });
        });
        it('should return false for non-existent key', async () => {
            mockContainer.item.mockImplementation(() => ({
                read: vi.fn().mockResolvedValue({ resource: null }),
            }));
            const result = await repository.revokeApiKey({
                keyId: 'non-existent',
                userId: mockUserId,
            });
            expect(result).toBe(false);
        });
    });
    describe('listApiKeys', () => {
        it('should list all API keys for a user', async () => {
            const mockKeys = [
                {
                    id: 'key-1',
                    userId: mockUserId,
                    keyHash: 'hash-1',
                    name: 'Key 1',
                    isActive: true,
                    createdAt: new Date().toISOString(),
                },
                {
                    id: 'key-2',
                    userId: mockUserId,
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
            mockContainer.items.query.mockReturnValue(mockQuery);
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
                userId: mockUserId,
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
            mockContainer.items.query.mockReturnValue(mockQuery);
            // Mock the hash function to return our test hash
            vi.mock('crypto', () => ({
                createHash: () => ({
                    update: () => ({
                        digest: () => keyHash,
                    }),
                }),
            }));
            const result = await repository.validateApiKey({
                key: keyValue,
                userId: mockUserId,
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
            mockContainer.items.query.mockReturnValue(mockQuery);
            const result = await repository.validateApiKey({
                key: 'invalid-key',
                userId: mockUserId,
            });
            expect(result.isValid).toBe(false);
            expect(result.key).toBeUndefined();
        });
        it('should respect IP restrictions', async () => {
            const allowedIp = '192.168.1.1';
            const mockKey = {
                id: 'key-123',
                userId: mockUserId,
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
            mockContainer.items.query.mockReturnValue(mockQuery);
            // Test with allowed IP
            const validResult = await repository.validateApiKey({
                key: 'valid-key',
                userId: mockUserId,
                ipAddress: allowedIp,
            });
            expect(validResult.isValid).toBe(true);
            // Test with disallowed IP
            const invalidResult = await repository.validateApiKey({
                key: 'valid-key',
                userId: mockUserId,
                ipAddress: '10.0.0.1',
            });
            expect(invalidResult.isValid).toBe(false);
        });
    });
});
