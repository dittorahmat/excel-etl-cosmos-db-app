// Mock the ApiKeyRepository first, before any imports
const mockValidateApiKey = vi.fn();

// Mock the Azure services
const mockUpsertRecord = vi.fn().mockResolvedValue({});
const mockContainer = {
  items: {
    upsert: mockUpsertRecord,
    query: vi.fn().mockReturnThis(),
    readAll: vi.fn().mockReturnThis(),
    fetchAll: vi.fn().mockResolvedValue({ resources: [] })
  }
};

// Mock the Azure Cosmos DB client
const mockCosmosDb = {
  database: vi.fn().mockReturnThis(),
  container: vi.fn().mockReturnValue(mockContainer)
} as any;

// Mock the ApiKeyRepository
vi.mock('../src/repositories/apiKeyRepository.js', () => ({
  ApiKeyRepository: vi.fn().mockImplementation(() => ({
    validateApiKey: mockValidateApiKey
  })),
  default: vi.fn().mockImplementation(() => ({
    validateApiKey: mockValidateApiKey
  }))
}));

// Mock the Azure services module
vi.mock('../src/config/azure-services.js', () => ({
  initializeAzureServices: vi.fn().mockResolvedValue({
    cosmosDb: mockCosmosDb,
    blobStorage: {}
  })
}));

// Mock the azure module
vi.mock('../src/config/azure.js', () => ({
  AzureCosmosDB: vi.fn().mockImplementation(() => mockCosmosDb)
}));

// Now import the actual implementation after setting up mocks
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { apiKeyAuth } from '../src/middleware/apiKeyAuth.js';

// Utility: chainable mock Response
function createMockResponse() {
  const res: any = {};
  res.status = vi.fn().mockReturnThis(); // Make status chainable
  res.json = vi.fn().mockReturnThis();   // Make json chainable
  res.send = vi.fn().mockReturnThis();   // Make send chainable
  return res as unknown as Response;
}

// Types
type ApiKeyAuthMiddleware = (options?: any) => RequestHandler;

// Extended Request type for testing
interface TestRequest extends Omit<Partial<Request>, 'get'> {
  user?: any;
  apiKey?: any;
  ip?: string;
  get(name: string): string | string[] | undefined;
  [key: string]: any; // Allow additional properties
}

// No need for duplicate mockCosmosDb

// Mock the logger to prevent console output during tests
vi.mock('../src/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('API Key Authentication Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Response;
  let nextFn: NextFunction;

  beforeEach(() => {
    mockReq = {
      headers: {},
      query: {},
      body: {},
      get: vi.fn(),
      ip: '127.0.0.1',
    } as unknown as Request;
    mockRes = createMockResponse();
    nextFn = vi.fn();
    vi.clearAllMocks();
    mockValidateApiKey.mockReset();
    mockValidateApiKey.mockResolvedValue({
      id: 'test-api-key-id',
      userId: 'test-user-id',
      name: 'test-key',
      key: 'test-api-key-value',
      lastUsedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  describe('apiKeyAuth', () => {
    it('should call next() with error if API key is invalid', async () => {
      // Arrange
      const userId = 'test-user-id';
      const apiKey = 'invalid-key';

      const req = {
        ...mockReq,
        headers: { 'authorization': `ApiKey ${apiKey}` },
        get: vi.fn((name: string) => name === 'authorization' ? `ApiKey ${apiKey}` : undefined),
        query: {},
        user: { oid: userId }, // Re-add user to ensure userId is present for API key validation
        ip: '127.0.0.1'
      } as unknown as Request;

      // Mock the repository to return { isValid: false }
      mockValidateApiKey.mockReset(); // Clear any previous calls
      mockValidateApiKey.mockResolvedValue({
        isValid: false,
        key: null
      });

      // Act
      const next = vi.fn();
      await apiKeyAuth(mockCosmosDb)(req, mockRes as Response, next);

      // Assert
      expect(mockValidateApiKey).toHaveBeenCalledTimes(1);
      expect(mockValidateApiKey).toHaveBeenCalledWith({
        key: apiKey,
        userId: userId, // Add userId back for the assertion
        ipAddress: '127.0.0.1'
      });
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Forbidden',
        message: 'Invalid or expired API key',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next() with error if API key is missing', async () => {
      // Arrange - no API key in headers
      const req = {
        ...mockReq,
        headers: {},
        get: vi.fn((name: string) => undefined)
        // No user property, expect 401 Unauthorized for missing user context
      } as unknown as Request;

      // Act
      const next = vi.fn();
      await apiKeyAuth(mockCosmosDb)(req, mockRes as Response, next);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Unauthorized',
        message: 'API key is required',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should validate API key from Authorization header', async () => {
      // Arrange
      const apiKey = 'test-api-key';
      const req = {
        ...mockReq,
        headers: { authorization: `ApiKey ${apiKey}` },
        get: vi.fn((name: string) => name === 'authorization' ? `ApiKey ${apiKey}` : undefined),
        query: {},
        user: { oid: 'test-user-id' },
        ip: '127.0.0.1'
      } as unknown as Request;

      // Mock the next function
      const next = vi.fn();

      // Mock the repository to return a valid API key
      mockValidateApiKey.mockResolvedValueOnce({
        isValid: true,
        key: {
          id: 'key-123',
          name: 'Test Key',
          key: apiKey,
          userId: 'test-user-id',
          lastUsedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      });

      // Act
      await apiKeyAuth(mockCosmosDb)(req, mockRes as Response, next);

      // Assert
      expect(mockValidateApiKey).toHaveBeenCalledWith({
        key: apiKey,
        userId: 'test-user-id', // Add userId back for the assertion
        ipAddress: '127.0.0.1'
      });
      expect(req.apiKey).toEqual({ id: 'key-123', name: 'Test Key' });
      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('should validate API key from query parameter', async () => {
      const req = {
        query: { api_key: 'test-key' },
        headers: {},
        user: { oid: 'test-user-id' }, // Re-add user to ensure userId is present for API key validation
        ip: '127.0.0.1'
      } as unknown as Request;

      // Mock the API key validation
      mockValidateApiKey.mockResolvedValueOnce({
        isValid: true,
        key: {
          id: 'key-123',
          name: 'Test Key',
          key: 'test-key',
          userId: 'test-user-id',
          lastUsedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      });

      // Create a mock response object
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      } as unknown as Response;

      // Create a mock next function
      const next = vi.fn();

      // Act
      await apiKeyAuth(mockCosmosDb)(req, res, next);

      // Assert
      expect(mockValidateApiKey).toHaveBeenCalledWith({
        key: 'test-key',
        userId: 'test-user-id', // Add userId back for the assertion
        ipAddress: '127.0.0.1'
      });
      expect(req.apiKey).toEqual({ id: 'key-123', name: 'Test Key' });
      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it('should return 403 for invalid API key', async () => {
      // Arrange
      const apiKey = 'invalid-key';
      const req = {
        ...mockReq,
        headers: { authorization: `ApiKey ${apiKey}` },
        user: { oid: 'test-user-id' }, // Re-add user to ensure userId is present for API key validation
      } as any;

      mockValidateApiKey.mockResolvedValue({ isValid: false });

      const res = { ...mockRes, status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;

      const middleware = apiKeyAuth(mockCosmosDb);

      // Act
      const next = vi.fn();
      await middleware(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Forbidden',
        message: 'Invalid or expired API key',
      });
    });

    it('should attach apiKey to request on successful authentication', async () => {
      // Arrange
      const apiKey = 'test-api-key-value';
      const req = {
        ...mockReq,
        headers: { 'authorization': `ApiKey ${apiKey}` },
        get: (name: string) => name === 'authorization' ? `ApiKey ${apiKey}` : undefined,
        query: {},
        user: { oid: 'user-123' }, // Re-add user to ensure userId is present for API key validation
        ip: '127.0.0.1'
      } as unknown as Request;

      // Mock the API key validation to return success
      vi.mocked(mockValidateApiKey).mockResolvedValueOnce({
        isValid: true,
        key: {
          id: 'key-123',
          name: 'Test Key',
          key: apiKey,
          userId: 'user-123',
          lastUsedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      });

      // Act
      await apiKeyAuth(mockCosmosDb)(req, mockRes as Response, nextFn);

      // Assert
      expect(mockValidateApiKey).toHaveBeenCalledWith({
        key: apiKey,
        userId: 'user-123', // Add userId back for the assertion
        ipAddress: '127.0.0.1'
      });
      expect(req.apiKey).toEqual({ id: 'key-123', name: 'Test Key' });
      expect(nextFn).toHaveBeenCalled();
    });
  });
});
