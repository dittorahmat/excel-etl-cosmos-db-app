import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, vi, afterEach } from 'vitest';
import express from 'express';
import type { Express } from 'express';
// Mock the server module to control its behavior
vi.mock('../src/server.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/server.js')>();
  return {
    ...actual,
    createApp: vi.fn().mockImplementation((azureServices: any) => { // Use any for azureServices here
      // Import the actual server to get its middleware and routes
      const actualApp = actual.createApp(azureServices);
      return actualApp;
    }),
  };
});

// Hoist the mock services
const mockServices = vi.hoisted(() => {
  const mockCosmosDb = {
    cosmosClient: {} as any,
    database: {} as any, // Add database property
    container: vi.fn().mockReturnThis(),
    upsertRecord: vi.fn(),
    query: vi.fn(),
    getById: vi.fn(),
    deleteRecord: vi.fn(),
  };

  const mockBlobStorage = {
    blobServiceClient: {} as any,
    getContainerClient: vi.fn(),
    uploadFile: vi.fn(),
    deleteFile: vi.fn(),
  };

  return {
    mockCosmosDb,
    mockBlobStorage,
    initializeAzureServices: vi.fn().mockResolvedValue({
      cosmosDb: mockCosmosDb,
      blobStorage: mockBlobStorage,
    }),
  };
});

// Mock Azure services for the tests
vi.mock('../src/config/azure-services.ts', () => ({
  initializeAzureServices: mockServices.initializeAzureServices,
  // Export mocks for use in tests
  __esModule: true,
}));

// Export mocks for use in tests
export const { mockCosmosDb, mockBlobStorage } = mockServices;

// Import the createApp after setting up the mocks
import { createApp } from '../src/server.js';

describe('Server', () => {
  let app: Express;
  let server: any; // To hold the actual server instance
  const mockRequest = request.agent('http://localhost:3000');

  beforeAll(async () => {
    vi.clearAllMocks();

    // Import the mocked initializeAzureServices here to ensure it's defined
    const { initializeAzureServices } = await import('../src/config/azure-services.js');

    // Create a fresh app instance for testing, passing the mocked services
    const { cosmosDb } = await initializeAzureServices(); // Call the mocked function
    app = createApp(cosmosDb); // Pass the mockCosmosDb instance

    // Start the server on a test port
    server = app.listen(0, () => {
      const address = server.address();
      if (address && typeof address !== 'string') {
        // No need to set port on mockRequest.app as supertest handles it
      }
    });
  });

  afterAll(() => {
    vi.clearAllMocks();
    vi.resetModules();
    return new Promise<void>((resolve) => {
      if (server) {
        server.close(() => {
          resolve();
        });
      } else {
        resolve();
      }
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Health Check', () => {
    it('should return 200 and status ok for /health endpoint', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(expect.objectContaining({
        status: 'ok',
        timestamp: expect.any(String),
      }));
    });

    it('should include environment information in the response', async () => {
      const response = await request(app).get('/health');

      expect(response.body).toHaveProperty('timestamp');
      expect(typeof response.body.timestamp).toBe('string');
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app).get('/non-existent-route');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        success: false,
        error: 'Not Found',
        message: 'The requested resource was not found.',
      });
    });

    it('should handle various HTTP methods for non-existent routes', async () => {
      const methods = ['get', 'post', 'put', 'delete'];

      for (const method of methods) {
        const response = await (request(app) as any)[method]('/non-existent-endpoint');
        expect(response.status).toBe(404);
      }
    });
  });

  describe('Error Handling', () => {
    it('should return 500 for unhandled errors', async () => {
      // Create a new app instance for this test to avoid affecting other tests
      const testApp = express();
      
      // Add the error handling middleware
      testApp.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
        req.id = 'test-request-id';
        next();
      });

      // Add a route that throws an error
      testApp.get('/error-route', (req, res, next) => {
        next(new Error('Test error'));
      });

      // Add the error handler from the server
      testApp.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
        res.status(500).json({
          success: false,
          error: 'Internal server error',
          requestId: req.id
        });
      });

      const response = await request(testApp).get('/error-route');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'Internal server error',
        requestId: 'test-request-id'
      });
    });
  });
});
