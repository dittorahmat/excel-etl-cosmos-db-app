import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createApp } from '../src/server';
import type { AzureCosmosDB } from '../src/types/custom';

// Mock dependencies
vi.mock('../src/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    http: vi.fn(),
    child: vi.fn().mockReturnThis(),
  },
  LogContext: vi.fn(),
}));

vi.mock('../src/repositories/apiKeyRepository', () => ({
  ApiKeyRepository: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('../src/repositories/apiKeyUsageRepository', () => ({
  ApiKeyUsageRepository: vi.fn().mockImplementation(() => ({})),
}));

// Mock the auth middleware to control its properties for testing
vi.mock('../src/middleware/authMiddleware.js', () => ({
    requireAuthOrApiKey: vi.fn(() => {
        const middleware = (req, res, next) => next();
        middleware.isAuthMiddleware = true; // Add a property to identify it
        return middleware;
    }),
}));

describe('createApp', () => {
  let mockAzureServices: AzureCosmosDB;

  beforeEach(() => {
    mockAzureServices = {
      cosmosClient: {} as any,
      database: {} as any,
      container: {} as any,
    };
    delete process.env.AUTH_ENABLED;
    delete process.env.NODE_ENV;
    vi.clearAllMocks();
  });

  it('should create an express app', () => {
    const app = createApp(mockAzureServices);
    expect(app).toBeDefined();
    expect(typeof app).toBe('function');
  });

  describe('Authentication Middleware', () => {
    it('should apply authentication middleware to /api/keys when AUTH_ENABLED is true', () => {
      process.env.AUTH_ENABLED = 'true';
      const app = createApp(mockAzureServices);

      const keysLayers = app._router.stack.filter(
        (layer) => layer.regexp.test('/api/keys') && layer.handle.isAuthMiddleware
      );
      expect(keysLayers.length).toBeGreaterThan(0);
    });

        it('should not apply rate limiting in development', () => {
      process.env.NODE_ENV = 'development';
      const app = createApp(mockAzureServices);
      const apiRateLimitLayer = app._router.stack.find(
        (layer) => layer.handle.name === 'apiRateLimit'
      );
      expect(apiRateLimitLayer).toBeUndefined();
    });

    it('should NOT apply authentication middleware to /api/keys when AUTH_ENABLED is false', () => {
      process.env.AUTH_ENABLED = 'false';
      const app = createApp(mockAzureServices);

      const keysLayers = app._router.stack.filter(
        (layer) => layer.regexp.test('/api/keys') && layer.handle.isAuthMiddleware
      );
      expect(keysLayers.length).toBe(0);
    });
  });
});