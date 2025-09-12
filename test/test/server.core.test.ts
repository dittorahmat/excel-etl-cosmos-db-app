import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createApp } from '../src/server.js';
import { initializeAzureServices } from '../src/config/azure-services.js';
import { ApiKeyRepository } from '../src/repositories/apiKeyRepository.js';
import { ApiKeyUsageRepository } from '../src/repositories/apiKeyUsageRepository.js';
import { logger } from '../src/utils/logger.js';

// Mock external dependencies
vi.mock('../src/config/azure-services.js');
vi.mock('../src/repositories/apiKeyRepository.js');
vi.mock('../src/repositories/apiKeyUsageRepository.js');
vi.mock('../src/utils/logger.js');
vi.mock('../src/routes/v2/index.js', () => ({
  createV2Router: vi.fn(() => express.Router()),
}));
vi.mock('../src/routes/v2/upload.route.js', () => ({
  uploadRouterV2: express.Router(),
}));
vi.mock('../src/routes/fields.route.js', () => ({
  createFieldsRouter: vi.fn(() => express.Router()),
}));
vi.mock('../src/routes/apiKey.route.js', () => ({
  createApiKeyRouter: vi.fn(() => express.Router()),
}));
vi.mock('../src/routes/auth.route.js', () => ({
  default: express.Router(),
}));
vi.mock('../src/middleware/authMiddleware.js', () => ({
  requireAuthOrApiKey: vi.fn(() => (req: any, res: any, next: any) => {
    req.user = { oid: 'mock-user-id' }; // Mock authenticated user
    next();
  }),
}));
vi.mock('../src/middleware/authLogger.js', () => ({
  authLogger: vi.fn((req: any, res: any, next: any) => next()),
  authErrorHandler: vi.fn((err: any, req: any, res: any, next: any) => next(err)),
}));
vi.mock('../src/middleware/auth.js', () => ({
  validateToken: vi.fn((req: any, res: any, next: any) => {
    req.user = { oid: 'mock-user-id' };
    next();
  }),
  authenticateToken: vi.fn((req: any, res: any, next: any) => {
    req.user = { oid: 'mock-user-id' };
    next();
  }),
}));

// Define mock functions for rate-limit outside of vi.mock to allow resetting
const productionMockRateLimit = vi.fn((req, res, next) => next());
const developmentMockRateLimit = vi.fn((req, res, next) => next());

vi.mock('express-rate-limit', () => ({
  default: vi.fn((options) => {
    if (process.env.NODE_ENV === 'production') {
      return productionMockRateLimit;
    } else {
      return developmentMockRateLimit;
    }
  }),
}));

describe('createApp', () => {
  let app: express.Express;
  const mockAzureServices = {
    cosmosDb: {
      container: vi.fn().mockReturnThis(),
      items: {
        upsert: vi.fn().mockResolvedValue({ resource: { id: 'mock-id' } }),
        query: vi.fn().mockReturnThis(),
        fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
      },
      query: vi.fn().mockReturnThis(),
      upsertRecord: vi.fn().mockResolvedValue({ resource: { id: 'mock-id' } }),
    },
    blobStorage: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(initializeAzureServices).mockResolvedValue(mockAzureServices as any);
    vi.mocked(ApiKeyRepository).mockImplementation(() => ({
      validateApiKey: vi.fn().mockResolvedValue({ isValid: true, keyId: 'mock-key-id', keyName: 'Mock Key' }),
      getApiKeyById: vi.fn().mockResolvedValue({ id: 'mock-key-id', name: 'Mock Key' }),
      createApiKey: vi.fn().mockResolvedValue({ id: 'new-key-id' }),
      updateApiKey: vi.fn().mockResolvedValue({ id: 'updated-key-id' }),
      deleteApiKey: vi.fn().mockResolvedValue(true),
      listApiKeys: vi.fn().mockResolvedValue([]),
    }) as any);
    vi.mocked(ApiKeyUsageRepository).mockImplementation(() => ({
      recordUsage: vi.fn().mockResolvedValue(true),
      getUsage: vi.fn().mockResolvedValue([]),
    }) as any);

    // Reset rate limit mocks before each test
    productionMockRateLimit.mockClear();
    developmentMockRateLimit.mockClear();

    // Set NODE_ENV to 'test' for consistent behavior
    process.env.NODE_ENV = 'test';
    app = createApp(mockAzureServices as any);
  });

  afterEach(() => {
    // Clean up any environment variables set during tests
    delete process.env.NODE_ENV;
  });

  it('should create an Express app instance', () => {
    expect(app).toBeDefined();
    expect(typeof app.listen).toBe('function');
  });
});
