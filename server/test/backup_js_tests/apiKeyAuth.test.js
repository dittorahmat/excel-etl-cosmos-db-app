import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiKeyAuth } from '../src/middleware/apiKeyAuth.js';
import { mockResponse } from '../src/test-utils/index.js';
// Mock the requireAuth middleware
const requireAuth = (options = {}) => {
    return (req, res, next) => {
        if (req.user) {
            return next();
        }
        return apiKeyAuth(options)(req, res, next);
    };
};
// Mock the ApiKeyRepository
vi.mock('../src/repositories/apiKeyRepository.js', () => ({
    ApiKeyRepository: vi.fn().mockImplementation(() => ({
        validateApiKey: vi.fn(),
    })),
}));
// Mock the Azure Cosmos DB client
vi.mock('../src/config/azure.js', () => ({
    initializeAzureServices: vi.fn().mockResolvedValue({
        container: vi.fn(),
    }),
}));
// Mock the logger to prevent console output during tests
vi.mock('../src/utils/logger.js', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    },
}));
describe('API Key Authentication Middleware', () => {
    let mockReq;
    let mockRes;
    let nextFn;
    let mockValidateApiKey;
    beforeEach(() => {
        vi.clearAllMocks();
        mockReq = {
            headers: {},
            query: {},
            user: undefined,
            ip: '127.0.0.1',
            // Add required properties to match Express Request type
            method: 'GET',
            url: '/',
            originalUrl: '/',
            params: {},
            body: {},
            cookies: {},
            signedCookies: {},
            get: vi.fn(),
            header: vi.fn(),
            accepts: vi.fn(),
            acceptsCharsets: vi.fn(),
            acceptsEncodings: vi.fn(),
            acceptsLanguages: vi.fn(),
            range: vi.fn(),
            is: vi.fn(),
            protocol: 'http',
            secure: false,
            ips: [],
            subdomains: [],
            path: '/',
            hostname: 'localhost',
            host: 'localhost:3000',
            fresh: true,
            stale: false,
            xhr: false,
            route: {},
        };
        mockRes = mockResponse();
        nextFn = vi.fn();
        // Reset the mock implementation for each test
        mockValidateApiKey = vi.fn();
        const { ApiKeyRepository } = await import('../../src/repositories/apiKeyRepository.js');
        vi.mocked(ApiKeyRepository).mockImplementation(() => ({
            validateApiKey: mockValidateApiKey,
        }));
    });
    describe('apiKeyAuth', () => {
        it('should call next() if user is already authenticated', async () => {
            // Arrange
            const req = { ...mockReq, user: { oid: 'user-123' } };
            const middleware = apiKeyAuth({});
            // Act
            await middleware(req, mockRes, nextFn);
            // Assert
            expect(nextFn).toHaveBeenCalled();
            expect(nextFn).toHaveBeenCalledWith();
            expect(mockValidateApiKey).not.toHaveBeenCalled();
        });
        it('should return 401 if no API key is provided', async () => {
            // Arrange
            const middleware = apiKeyAuth({});
            const send = vi.fn();
            const status = vi.fn().mockReturnValue({ send });
            const res = { ...mockRes, status };
            // Act
            await middleware(mockReq, res, nextFn);
            // Assert
            expect(status).toHaveBeenCalledWith(401);
            expect(send).toHaveBeenCalledWith({
                success: false,
                error: 'Unauthorized',
                message: 'API key is required',
            });
        });
        it('should validate API key from Authorization header', async () => {
            // Arrange
            const apiKey = 'test-api-key';
            const req = {
                ...mockReq,
                headers: { authorization: `ApiKey ${apiKey}` },
            };
            mockValidateApiKey.mockResolvedValue({
                isValid: true,
                key: { id: 'key-123', name: 'Test Key' },
            });
            const middleware = apiKeyAuth({});
            // Act
            await middleware(req, mockRes, nextFn);
            // Assert
            expect(mockValidateApiKey).toHaveBeenCalledWith({
                key: apiKey,
                userId: undefined, // No user context yet
                ipAddress: '127.0.0.1',
            });
            expect(req.apiKey).toEqual({ id: 'key-123', name: 'Test Key' });
            expect(nextFn).toHaveBeenCalled();
        });
        it('should validate API key from query parameter', async () => {
            // Arrange
            const apiKey = 'test-api-key';
            const req = {
                ...mockReq,
                query: { api_key: apiKey },
            };
            mockValidateApiKey.mockResolvedValue({
                isValid: true,
                key: { id: 'key-123', name: 'Test Key' },
            });
            const middleware = apiKeyAuth({});
            // Act
            await middleware(req, mockRes, nextFn);
            // Assert
            expect(mockValidateApiKey).toHaveBeenCalledWith({
                key: apiKey,
                userId: undefined,
                ipAddress: '127.0.0.1',
            });
            expect(nextFn).toHaveBeenCalled();
        });
        it('should return 403 for invalid API key', async () => {
            // Arrange
            const apiKey = 'invalid-key';
            const req = {
                ...mockReq,
                headers: { authorization: `ApiKey ${apiKey}` },
            };
            mockValidateApiKey.mockResolvedValue({ isValid: false });
            const send = vi.fn();
            const status = vi.fn().mockReturnValue({ send });
            const res = { ...mockRes, status };
            const middleware = apiKeyAuth({});
            // Act
            await middleware(req, res, nextFn);
            // Assert
            expect(status).toHaveBeenCalledWith(403);
            expect(send).toHaveBeenCalledWith({
                success: false,
                error: 'Forbidden',
                message: 'Invalid or expired API key',
            });
        });
    });
    describe('requireAuth', () => {
        it('should allow access with valid Azure AD token', async () => {
            // Arrange
            const req = { ...mockReq, user: { oid: 'user-123' } };
            const middleware = requireAuth({});
            // Act
            await middleware(req, mockRes, nextFn);
            // Assert
            expect(nextFn).toHaveBeenCalled();
        });
        it('should allow access with valid API key', async () => {
            // Arrange
            const apiKey = 'valid-key';
            const req = {
                ...mockReq,
                headers: { authorization: `ApiKey ${apiKey}` },
            };
            mockValidateApiKey.mockResolvedValue({
                isValid: true,
                key: { id: 'key-123', name: 'Test Key' },
            });
            const middleware = requireAuth({});
            // Act
            await middleware(req, mockRes, nextFn);
            // Assert
            expect(nextFn).toHaveBeenCalled();
        });
        it('should return 401 if no authentication provided', async () => {
            // Arrange
            const send = vi.fn();
            const status = vi.fn().mockReturnValue({ send });
            const res = { ...mockRes, status };
            const middleware = requireAuth({});
            // Act
            await middleware(mockReq, res, nextFn);
            // Assert
            expect(status).toHaveBeenCalledWith(401);
            expect(send).toHaveBeenCalledWith({
                success: false,
                error: 'Unauthorized',
                message: 'Authentication required',
            });
        });
    });
});
