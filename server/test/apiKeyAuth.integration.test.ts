import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import type { Application, Request } from 'express';
import express from 'express';
import { createServer, Server } from 'http';
import { createMockCosmosContainer } from './test-utils.js';
import { apiKeyAuth } from '../src/middleware/apiKeyAuth.js';
import { createTestApiKey } from './__mocks__/apiKey/apiKey.test.utils.js';
import { mockValidateApiKey, mockCosmosDb } from './__mocks__/apiKey/apiKey.test.mocks.js';
import { ApiKeyRepository } from '../src/repositories/apiKeyRepository.js';
import type { ValidateApiKeyResult } from './__mocks__/apiKey/apiKey.test.types.js';

// Extend Express Request type to include user
declare global {
  // Extend the existing Express Request type to include user
  interface Request {
    user?: {
      id: string;
      name?: string;
      email?: string;
      apiKeyId?: string;
      [key: string]: any;
    };
  }
}

describe('API Key Authentication Integration', () => {
  let app: Application;
  let server: Server;
  let testRepository: ApiKeyRepository;
  const testPort = 3001;
  const baseUrl = `http://localhost:${testPort}`;

  beforeAll(async () => {
    vi.clearAllMocks();

    // Create a mock CosmosDB container with test data
    const testApiKey = {
      id: 'test-key-id',
      userId: 'test-user-id',
      name: 'Test API Key',
      keyHash: 'mocked-hash-value',
      isActive: true,
      allowedIps: ['*'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastUsedAt: null,
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      lastUsedFromIp: null
    };

    // Create test repository with properly mocked CosmosDB
    const mockContainer = createMockCosmosContainer([testApiKey]);
    // Mock the container method to return our mock container
    vi.mocked(mockCosmosDb.container).mockImplementation(async () => mockContainer as any);
    testRepository = new ApiKeyRepository(mockCosmosDb);

    // Setup mock implementation for validateApiKey
    mockValidateApiKey.mockImplementation(async (params: { key: string }): Promise<ValidateApiKeyResult> => {
      if (!params.key) {
        return {
          isValid: false,
          error: 'API key is required',
          key: null
        };
      }

      if (params.key === 'valid-header-key' || params.key === 'valid-query-key') {
        return {
          isValid: true,
          key: testApiKey
        };
      }

      if (params.key === 'revoked-key') {
        return {
          isValid: false,
          error: 'API key has been revoked',
          key: { ...testApiKey, isActive: false }
        };
      }

      return {
        isValid: false,
        error: 'Invalid API key',
        key: null
      };
    });

    // Create Express app
    app = express();

    // Add middleware
    app.use(express.json());

    // Add API key auth middleware with repository
    app.use(apiKeyAuth(testRepository));

    // Test route that requires authentication
    app.get('/protected', (req, res) => {
      res.status(200).json({
        message: 'Authenticated',
        user: req.user
      });
    });

    // Error handling middleware
    app.use((err: any, req: any, res: any, next: any) => {
      res.status(err.status || 500).json({
        error: {
          message: err.message || 'Internal Server Error',
          ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        }
      });
    });

    // Create HTTP server
    server = createServer(app);

    // Start the server
    await new Promise<void>((resolve) => {
      server.listen(testPort, () => {
        console.log(`Test server running on port ${testPort}`);
        resolve();
      });
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset the default mock implementation
    mockValidateApiKey.mockImplementation(async () => ({
      isValid: false,
      error: 'Invalid API key'
    }));
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => {
        console.log('Test server closed');
        resolve();
      });
    });
  });

  it('should return 401 if no API key is provided', async () => {
    // Act
    const response = await request(app)
      .get('/protected')
      .expect('Content-Type', /json/)
      .expect(401);

    // Assert
    expect(response.body).toMatchObject({
      error: {
        message: 'API key is required'
      }
    });
  });

  it('should return 401 for invalid API key format', async () => {
    // Act
    const response = await request(app)
      .get('/protected')
      .set('Authorization', 'InvalidFormat')
      .expect('Content-Type', /json/)
      .expect(401);

    // Assert
    expect(response.body).toMatchObject({
      error: {
        message: 'Invalid API key format'
      }
    });
  });

  it('should return 200 for valid API key in header', async () => {
    // Arrange
    const apiKey = 'valid-header-key';

    // Act
    const response = await request(app)
      .get('/protected')
      .set('Authorization', `ApiKey ${apiKey}`)
      .expect('Content-Type', /json/)
      .expect(200);

    // Assert
    expect(response.body).toMatchObject({
      message: 'Access granted',
      key: {
        id: 'test-key-id',
        userId: 'test-user-id',
        name: 'Test API Key',
        isActive: true
      }
    });

    // Verify mock was called with the correct API key
    expect(mockValidateApiKey).toHaveBeenCalledWith({ key: apiKey });
  });

  it('should return 401 for revoked API key', async () => {
    // Arrange
    const apiKey = 'revoked-key';

    // Override the mock for this specific test
    mockValidateApiKey.mockResolvedValueOnce({
      isValid: false,
      key: null,
      error: 'API key has been revoked'
    });

    // Act
    const response = await request(app)
      .get('/protected')
      .set('Authorization', `ApiKey ${apiKey}`)
      .expect('Content-Type', /json/)
      .expect(401);

    // Assert
    expect(response.body).toMatchObject({
      error: {
        message: 'API key has been revoked'
      }
    });
  });

  it('should return 401 for invalid IP address', async () => {
    // Arrange
    const apiKey = 'valid-ip-restricted-key';

    // Override the mock for this specific test
    mockValidateApiKey.mockResolvedValueOnce({
      isValid: false,
      key: null,
      error: 'Access denied from this IP address'
    });

    // Act
    const response = await request(app)
      .get('/protected')
      .set('Authorization', `ApiKey ${apiKey}`)
      .set('X-Forwarded-For', '10.0.0.1')
      .expect('Content-Type', /json/)
      .expect(401);

    // Assert
    expect(response.body).toMatchObject({
      error: {
        message: 'Access denied from this IP address'
      }
    });
  });

  it('should return 401 for non-existent API key', async () => {
    // Arrange
    const apiKey = 'non-existent-key';

    // Override the mock for this specific test
    mockValidateApiKey.mockResolvedValueOnce({
      isValid: false,
      key: undefined,
      error: 'API key not found'
    });

    // Act
    const response = await request(app)
      .get('/protected')
      .set('Authorization', `ApiKey ${apiKey}`)
      .expect('Content-Type', /json/)
      .expect(401);

    // Assert
    expect(response.body).toMatchObject({
      error: {
        message: 'API key not found'
      }
    });
  });
});
