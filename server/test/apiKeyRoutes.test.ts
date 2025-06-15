import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { json } from 'body-parser';
import { ApiKeyRepository } from '../src/repositories/apiKeyRepository';
import { apiKeyRoutes } from '../src/routes/apiKey.route';

// Mock the ApiKeyRepository
vi.mock('../src/repositories/apiKeyRepository', () => ({
  ApiKeyRepository: vi.fn().mockImplementation(() => ({
    createApiKey: vi.fn(),
    listApiKeys: vi.fn(),
    revokeApiKey: vi.fn(),
  })),
}));

// Mock the Azure Cosmos DB client
vi.mock('../src/config/azure', () => ({
  initializeAzureServices: vi.fn().mockResolvedValue({
    container: vi.fn(),
  }),
}));

// Mock the express router
vi.mock('express', async () => {
  const actual = await vi.importActual('express');
  return {
    ...actual,
    Router: () => ({
      post: vi.fn(),
      get: vi.fn(),
      delete: vi.fn(),
      use: vi.fn(),
    }),
  };
});

describe('API Key Routes', () => {
  let app: express.Express;
  let mockCreateApiKey: any;
  let mockListApiKeys: any;
  let mockRevokeApiKey: any;
  const mockUserId = 'user-123';
  const mockToken = 'mock-jwt-token';

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create a new Express app for each test
    app = express();
    app.use(json());
    
    // Mock authentication middleware
    app.use((req, res, next) => {
      req.user = { oid: mockUserId };
      next();
    });
    
    // Setup routes
    app.use('/api/keys', apiKeyRoutes);
    
    // Get the mock repository methods
    const mockRepo = new ApiKeyRepository({} as any);
    mockCreateApiKey = mockRepo.createApiKey as any;
    mockListApiKeys = mockRepo.listApiKeys as any;
    mockRevokeApiKey = mockRepo.revokeApiKey as any;
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
      // Create a new app without the auth middleware
      const unauthApp = express();
      unauthApp.use(json());
      unauthApp.use('/api/keys', apiKeyRoutes);

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
        expect(response.body).toEqual({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }
    });
  });
});
