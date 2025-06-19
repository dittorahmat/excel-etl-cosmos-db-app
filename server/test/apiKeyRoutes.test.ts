import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { json } from 'body-parser';
import { ApiKeyRepository } from '../src/repositories/apiKeyRepository.js';
import { createApiKeyRouter } from '../src/routes/apiKey.route.js';

// Mock the authentication middleware to always attach a user for positive tests
vi.mock('../src/middleware/auth.js', () => ({
  authenticateToken: (req: any, _res: any, next: any) => {
    req.user = { oid: 'user-123' };
    next();
  },
}));

// Mock the ApiKeyRepository
// Remove this duplicate mock; only use the .js extension mock below

// Mock the Azure Cosmos DB client
vi.mock('../src/config/azure-services.js', () => ({
  initializeAzureServices: vi.fn().mockResolvedValue({
    cosmosDb: {
      upsertRecord: vi.fn().mockResolvedValue({}),
    },
  }),
}));

// Import the actual router


// Mock the ApiKeyRepository methods
const mockCreateApiKey = vi.fn();
const mockListApiKeys = vi.fn();
const mockRevokeApiKey = vi.fn();

// Mock the ApiKeyRepository class
vi.mock('../src/repositories/apiKeyRepository.js', () => ({
  ApiKeyRepository: vi.fn().mockImplementation(() => ({
    createApiKey: mockCreateApiKey,
    listApiKeys: mockListApiKeys,
    revokeApiKey: mockRevokeApiKey,
  })),
}));

describe('API Key Routes', () => {
  const originalAuth = require('../src/middleware/auth.js');
  let app: express.Express;
  const mockUserId = 'user-123';
  const mockToken = 'mock-jwt-token';

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Create a new Express app for each test
    app = express();
    app.use(json());
    
    // Mock authentication middleware
    app.use((req: any, _res, next) => {
      req.user = { oid: mockUserId };
      next();
    });
    
    // Setup routes
    // CosmosDb mock can be an empty object for routing tests
    const cosmosDbMock = {} as any;
    const apiKeyRouter = createApiKeyRouter(cosmosDbMock);
    app.use('/api/keys', apiKeyRouter);
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
        userId: mockUserId,
      };
      
      mockCreateApiKey.mockResolvedValue(mockApiKey);
      
      const requestBody = {
        name: 'Test Key',
      };

      // Act
      const response = await request(app)
        .post('/api/keys')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(requestBody);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        success: true,
        data: {
          id: mockApiKey.id,
          key: mockApiKey.key,
          name: mockApiKey.name,
          createdAt: mockApiKey.createdAt,
          expiresAt: mockApiKey.expiresAt,
        },
      });
      
      expect(mockCreateApiKey).toHaveBeenCalledWith(mockUserId, {
        name: 'Test Key',
        expiresAt: undefined,
        allowedIps: undefined,
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
      // Override the authenticateToken mock for this test only
      const authModule = require('../src/middleware/auth.js');
      const originalAuthFn = authModule.authenticateToken;
      authModule.authenticateToken = (_req: any, _res: any, next: any) => {
        // Don't set req.user, just call next()
        next();
      };

      const unauthApp = express();
      unauthApp.use(json());
      const cosmosDbMock = {} as any;
      const apiKeyRouter = createApiKeyRouter(cosmosDbMock);
      unauthApp.use('/api/keys', apiKeyRouter);

      // Test all routes
      const routes = [
        { method: 'post', path: '/api/keys' },
        { method: 'get', path: '/api/keys' },
        { method: 'delete', path: '/api/keys/123' },
      ];

      for (const route of routes) {
        const response = await (request(unauthApp) as any)
          [route.method](route.path);

        expect(response.status).toBe(401);
        // Accept either the default error or the custom error shape
        expect(response.body).toMatchObject({
          // Accept either actual error or shape
          message: expect.any(String),
        });
      }

      // Restore the original mock
      authModule.authenticateToken = originalAuthFn;
    });
  });
});
