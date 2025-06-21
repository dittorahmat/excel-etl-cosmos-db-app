import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest'; // Import supertest
import { createApp } from '../src/server.js';
import { initializeAzureServices } from '../src/config/azure-services.js';
import { v4 as uuidv4 } from 'uuid';
import { Container } from '@azure/cosmos';

// Mock the Azure services
vi.mock('../src/config/azure-services.js', () => ({
  initializeAzureServices: vi.fn(),
}));

describe('Data Endpoint', () => {
  let app: any;
  let mockCosmosDb: {
    container: Container;
    queryRecords: ReturnType<typeof vi.fn>;
  };
  let testUserId: string;

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    // Setup test user
    testUserId = uuidv4();

    // Mock Cosmos DB
    mockCosmosDb = {
      container: {} as Container,
      queryRecords: vi.fn().mockResolvedValue({
        resources: [
          { id: '1', category: 'test', date: '2025-01-01', amount: 100 },
          { id: '2', category: 'test', date: '2025-01-02', amount: 200 },
        ],
        hasMoreResults: false,
      }),
    };

    // Mock initializeAzureServices
    (initializeAzureServices as any).mockResolvedValue({
      cosmosDb: mockCosmosDb,
    });

    // Create Express app
    app = createApp(mockCosmosDb as any); // Pass mockCosmosDb to createApp
  });

  describe('GET /api/data', () => {
    it('should return data with default pagination', async () => {
      const response = await request(app)
        .get('/api/data')
        .set('Authorization', `Bearer mock-token`) // Assuming auth is handled by middleware
        .query({});

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({
        items: [
          { id: '1', category: 'test', date: '2025-01-01', amount: 100 },
          { id: '2', category: 'test', date: '2025-01-02', amount: 200 },
        ],
        count: 2,
      });
    });

    it('should filter by date range', async () => {
      const response = await request(app)
        .get('/api/data')
        .set('Authorization', `Bearer mock-token`)
        .query({
          startDate: '2025-01-01',
          endDate: '2025-01-31',
        });

      expect(mockCosmosDb.queryRecords).toHaveBeenCalledWith(
        expect.stringContaining('WHERE'),
        expect.arrayContaining([
          { name: '@startDate0', value: '2025-01-01' },
          { name: '@endDate1', value: '2025-01-31' },
        ])
      );
      expect(response.statusCode).toBe(200);
    });

    it('should filter by category', async () => {
      const response = await request(app)
        .get('/api/data')
        .set('Authorization', `Bearer mock-token`)
        .query({
          category: 'test',
        });

      expect(mockCosmosDb.queryRecords).toHaveBeenCalledWith(
        expect.stringContaining('LOWER(c.category) = LOWER(@category0)'),
        expect.arrayContaining([
          { name: '@category0', value: 'test' },
        ])
      );
      expect(response.statusCode).toBe(200);
    });

    it('should handle pagination with continuation token', async () => {
      mockCosmosDb.queryRecords.mockResolvedValueOnce({
        resources: [{ id: '1' }, { id: '2' }],
        hasMoreResults: true,
        continuationToken: 'token123',
      });

      const response = await request(app)
        .get('/api/data')
        .set('Authorization', `Bearer mock-token`)
        .query({
          limit: '2',
          continuationToken: 'token123',
        });

      expect(response.body).toEqual({
        items: [{ id: '1' }, { id: '2' }],
        count: 2,
        continuationToken: 'token123',
      });
    });

    it('should handle empty results', async () => {
      mockCosmosDb.queryRecords.mockResolvedValueOnce({
        resources: [],
        hasMoreResults: false,
      });

      const response = await request(app)
        .get('/api/data')
        .set('Authorization', `Bearer mock-token`)
        .query({
          category: 'nonexistent',
        });

      expect(response.body).toEqual({
        items: [],
        count: 0,
      });
    });

    it('should handle Cosmos DB errors', async () => {
      const testError = new Error('Cosmos DB error');
      mockCosmosDb.queryRecords.mockRejectedValueOnce(testError);

      const response = await request(app)
        .get('/api/data')
        .set('Authorization', `Bearer mock-token`)
        .query({});

      expect(response.statusCode).toBe(500);
      expect(response.body).toEqual({
        error: 'Internal Server Error',
        message: 'Cosmos DB error',
      });
    });
  });
});
