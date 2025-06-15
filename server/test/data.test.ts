import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockRequest, mockResponse, mockNext } from './test-utils.js';
import { createApp } from '../src/server.js';
import { initializeCosmosDB } from '../src/config/azure.js';
import { v4 as uuidv4 } from 'uuid';
import { Container } from '@azure/cosmos';

// Mock the Azure services
vi.mock('../src/config/azure', () => ({
  initializeCosmosDB: vi.fn(),
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

    // Mock initializeCosmosDB
    (initializeCosmosDB as jest.Mock).mockResolvedValue({
      cosmosDb: mockCosmosDb,
    });

    // Create Express app
    app = createApp();
  });

  describe('GET /api/data', () => {
    it('should return data with default pagination', async () => {
      const req = mockRequest({
        method: 'GET',
        url: '/api/data',
        user: { oid: testUserId },
        query: {},
      });
      
      const res = mockResponse();
      const next = mockNext();
      
      await app._router.handle(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        items: [
          { id: '1', category: 'test', date: '2025-01-01', amount: 100 },
          { id: '2', category: 'test', date: '2025-01-02', amount: 200 },
        ],
        count: 2,
      });
    });

    it('should filter by date range', async () => {
      const req = mockRequest({
        method: 'GET',
        url: '/api/data',
        user: { oid: testUserId },
        query: {
          startDate: '2025-01-01',
          endDate: '2025-01-31',
        },
      });
      
      const res = mockResponse();
      const next = mockNext();
      
      await app._router.handle(req, res, next);
      
      expect(mockCosmosDb.queryRecords).toHaveBeenCalledWith(
        expect.stringContaining('WHERE'),
        expect.arrayContaining([
          { name: '@startDate0', value: '2025-01-01' },
          { name: '@endDate1', value: '2025-01-31' },
        ])
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should filter by category', async () => {
      const req = mockRequest({
        method: 'GET',
        url: '/api/data',
        user: { oid: testUserId },
        query: {
          category: 'test',
        },
      });
      
      const res = mockResponse();
      const next = mockNext();
      
      await app._router.handle(req, res, next);
      
      expect(mockCosmosDb.queryRecords).toHaveBeenCalledWith(
        expect.stringContaining('LOWER(c.category) = LOWER(@category0)'),
        expect.arrayContaining([
          { name: '@category0', value: 'test' },
        ])
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should handle pagination with continuation token', async () => {
      mockCosmosDb.queryRecords.mockResolvedValueOnce({
        resources: [{ id: '1' }, { id: '2' }],
        hasMoreResults: true,
        continuationToken: 'token123',
      });
      
      const req = mockRequest({
        method: 'GET',
        url: '/api/data',
        user: { oid: testUserId },
        query: {
          limit: '2',
          continuationToken: 'token123',
        },
      });
      
      const res = mockResponse();
      const next = mockNext();
      
      await app._router.handle(req, res, next);
      
      expect(res.json).toHaveBeenCalledWith({
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
      
      const req = mockRequest({
        method: 'GET',
        url: '/api/data',
        user: { oid: testUserId },
        query: {
          category: 'nonexistent',
        },
      });
      
      const res = mockResponse();
      const next = mockNext();
      
      await app._router.handle(req, res, next);
      
      expect(res.json).toHaveBeenCalledWith({
        items: [],
        count: 0,
      });
    });

    it('should handle Cosmos DB errors', async () => {
      const testError = new Error('Cosmos DB error');
      mockCosmosDb.queryRecords.mockRejectedValueOnce(testError);
      
      const req = mockRequest({
        method: 'GET',
        url: '/api/data',
        user: { oid: testUserId },
        query: {},
      });
      
      const res = mockResponse();
      const next = mockNext();
      
      await app._router.handle(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        message: 'Cosmos DB error',
      });
    });
  });
});
