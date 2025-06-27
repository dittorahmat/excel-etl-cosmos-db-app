// Vitest globals are available automatically in test files
import request from 'supertest';
import express, { type Express } from 'express';
import { json } from 'body-parser';
import path from 'path';

// Define the auth module path as a relative path
const authModulePath = '../../src/middleware/auth.js';

// Mock the authentication middleware with inline implementation first
vi.mock(authModulePath, () => ({
  authenticateToken: vi.fn((req: any, _res: any, next: any) => {
    req.user = { oid: 'user-123' };
    next();
  }),
  __esModule: true,
}));

// Mock the rate limiter middleware
vi.mock('../src/middleware/rateLimit.js', () => {
  const rateLimitMock = vi.fn((_options: any) => (_req: any, _res: any, next: any) => next());
  
  // Create a mock implementation of createRateLimiter that returns a rate limiter middleware
  const createRateLimiter = vi.fn().mockImplementation((options: any) => {
    return (_req: any, _res: any, next: any) => next();
  });
  
  return {
    rateLimit: rateLimitMock,
    createRateLimiter: createRateLimiter,
    __esModule: true
  };
});

// Mock the Azure Cosmos DB client
vi.mock('../src/config/azure-services', () => ({
  initializeAzureServices: vi.fn().mockResolvedValue({
    cosmosDb: {
      upsertRecord: vi.fn().mockResolvedValue({}),
    },
  }),
}));

// Mock the ApiKeyRepository methods
const mockCreateApiKey = vi.fn();
const mockListApiKeys = vi.fn().mockResolvedValue({ keys: [] });
const mockRevokeApiKey = vi.fn().mockResolvedValue(true);

// Import the route after setting up all mocks
let createApiKeyRouter: any; // Will be initialized in beforeAll

// Mock the ApiKeyRepository class
vi.mock('../src/repositories/apiKeyRepository', () => ({
  ApiKeyRepository: vi.fn().mockImplementation(() => ({
    createApiKey: mockCreateApiKey,
    listApiKeys: mockListApiKeys,
    revokeApiKey: mockRevokeApiKey,
  })),
}));

describe('API Key Routes', () => {
  let app: express.Express;
  const mockUserId = 'user-123';
  const mockToken = 'mock-jwt-token';

  // Get the mock implementation of authenticateToken at the module level
  const setupAuthMock = () => {
    const authModulePath = path.join(__dirname, '../src/middleware/auth');
    const authModule = require(authModulePath);
    const mockAuthenticateToken = vi.mocked(authModule.authenticateToken);
    
    // Reset the authenticateToken mock
    mockAuthenticateToken.mockImplementation((req: any, _res: any, next: any) => {
      req.user = { oid: mockUserId };
      next();
    });
    
    return mockAuthenticateToken;
  };

  beforeAll(async () => {
    // Import the route after setting up all mocks
    const module = await import('../src/routes/apiKey.route.js');
    createApiKeyRouter = module.createApiKeyRouter;
  });

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup auth mock
    setupAuthMock();

    // Create a new Express app for each test
    app = express();
    app.use(json());

    // Setup routes with a timeout for tests
    const cosmosDbMock = {} as any;
    const apiKeyRouter = createApiKeyRouter(cosmosDbMock);
    app.use('/api/keys', apiKeyRouter);
    
    // Add error handling middleware to prevent unhandled rejections
    app.use((err: any, _req: any, res: any, _next: any) => {
      console.error('Test error handler:', err);
      res.status(500).json({
        success: false,
        error: 'Test Error',
        message: err.message,
      });
    });
  });
  
  afterEach(() => {
    // Clean up any pending timeouts
    vi.clearAllTimers();
  });

  describe('POST /api/keys', () => {
    it('should create a new API key', async () => {
      // Arrange
      const mockApiKey = {
        id: 'key-123',
        key: 'generated-api-key',
        name: 'Test Key',
        createdAt: new Date().toISOString(),
        expiresAt: null,
        allowedIps: [],
        userId: mockUserId,
      };

      // Setup mocks
      mockListApiKeys.mockResolvedValueOnce({ keys: [] }); // No existing keys
      mockCreateApiKey.mockResolvedValueOnce(mockApiKey);

      // Act
      const response = await request(app)
        .post('/api/keys')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          name: 'Test Key',
          expiresAt: null,
          allowedIps: []
        });

      // Assert
      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        success: true,
        data: mockApiKey
      });
      expect(mockListApiKeys).toHaveBeenCalledWith(mockUserId);
      expect(mockCreateApiKey).toHaveBeenCalledWith(mockUserId, {
        name: 'Test Key',
        expiresAt: null,
        allowedIps: []
      });
    });

    it('should validate request body', async () => {
      // Act
      const response = await request(app)
        .post('/api/keys')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({});

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation Error');
      expect(response.body.details).toContain('name is required');
    });
  });

  describe('GET /api/keys', () => {
    it('should list API keys for the current user', async () => {
      // Arrange
      const mockKeys = {
        keys: [
          {
            id: 'key-1',
            name: 'Key 1',
            isActive: true,
            createdAt: '2025-01-01T00:00:00.000Z',
            lastUsedAt: '2025-01-02T00:00:00.000Z',
          },
          {
            id: 'key-2',
            name: 'Key 2',
            isActive: false,
            createdAt: '2025-01-03T00:00:00.000Z',
            lastUsedAt: null,
          },
        ],
      };

      // Reset the mock and set up the implementation for this test
      mockListApiKeys.mockReset();
      mockListApiKeys.mockResolvedValue(mockKeys);

      // Act
      const response = await request(app)
        .get('/api/keys')
        .set('Authorization', `Bearer ${mockToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: mockKeys.keys,
      });

      expect(mockListApiKeys).toHaveBeenCalledTimes(1);
      expect(mockListApiKeys).toHaveBeenCalledWith(mockUserId);
    });
  });

  describe('DELETE /api/keys/:keyId', () => {
    it('should revoke an API key', async () => {
      // Arrange
      const keyId = 'key-123';
      mockRevokeApiKey.mockResolvedValue(true);

      // Act
      const response = await request(app)
        .delete(`/api/keys/${keyId}`)
        .set('Authorization', `Bearer ${mockToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'API key revoked successfully',
      });

      expect(mockRevokeApiKey).toHaveBeenCalledWith({
        keyId,
        userId: mockUserId,
      });
    });

    it('should return 404 if key not found', async () => {
      // Arrange
      const keyId = 'non-existent-key';
      mockRevokeApiKey.mockResolvedValue(false);

      // Act
      const response = await request(app)
        .delete(`/api/keys/${keyId}`)
        .set('Authorization', `Bearer ${mockToken}`);

      // Assert
      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        success: false,
        error: 'Not Found',
        message: 'API key not found or already revoked',
      });
    });
  });

  describe('Authentication', () => {
    it('should require authentication for all routes', async () => {
      // Get the current mock implementation of authenticateToken
      const authModule = await import(authModulePath);
      const mockAuthenticateToken = vi.mocked(authModule.authenticateToken);
      
      // Override the mock to not set req.user
      mockAuthenticateToken.mockImplementationOnce((_req: any, _res: any, next: any) => {
        // Don't set req.user to simulate unauthenticated request
        next();
      });

      // Test GET /api/keys without authentication
      const getResponse = await request(app)
        .get('/api/keys')
        .set('Authorization', 'Bearer invalid-token');

      expect(getResponse.status).toBe(401);
      expect(getResponse.body).toEqual({
        success: false,
        error: 'Unauthorized',
        message: 'User ID not found',
      });

      // Override the mock again for the next test
      mockAuthenticateToken.mockImplementationOnce((_req: any, _res: any, next: any) => {
        // Don't set req.user to simulate unauthenticated request
        next();
      });

      // Test POST /api/keys without authentication
      const postResponse = await request(app)
        .post('/api/keys')
        .set('Authorization', 'Bearer invalid-token')
        .send({ name: 'Test Key' });

      expect(postResponse.status).toBe(401);
      expect(postResponse.body).toEqual({
        success: false,
        error: 'Unauthorized',
        message: 'User ID not found',
      });
    });
  });
});
