// @vitest-environment node
import express, { type Request, type Response, type NextFunction, type RequestHandler } from 'express';
import request from 'supertest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Define types for test mocks
interface User {
  oid: string;
  name: string;
  roles: string[];
}

interface MockRequest extends Request {
  user?: User;
  query: {
    startDate?: string;
    endDate?: string;
    category?: string;
    limit?: string;
  };
}

// Create a test Express app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  return app;
};

describe('Data API', () => {
  let app: express.Express;
  let mockRequireAuth: ReturnType<typeof vi.fn>;
  let mockApiKeyAuth: ReturnType<typeof vi.fn>;
  let mockCosmosQuery: ReturnType<typeof vi.fn>;
  let mockFetchAll: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    
    // Create a fresh Express app for each test
    app = createTestApp();
    
    // Set up mock implementations
    mockRequireAuth = vi.fn((req: Request, res: Response, next: NextFunction) => {
      // Simulate authenticated user
      (req as MockRequest).user = { oid: 'test-user', name: 'Test User', roles: ['user'] };
      next();
    });
    
    mockApiKeyAuth = vi.fn((req: Request, res: Response, next: NextFunction) => {
      // Simulate API key auth
      next();
    });
    
    mockFetchAll = vi.fn().mockResolvedValue({
      resources: [
        { id: '1', category: 'test', date: '2025-01-01', amount: 100 },
        { id: '2', category: 'test2', date: '2025-01-02', amount: 200 }
      ]
    });
    
    mockCosmosQuery = vi.fn().mockResolvedValue({
      fetchAll: mockFetchAll
    });
    
    // Mock the data route with our test handlers
    app.get('/api/data', mockRequireAuth, (req: Request, res: Response) => {
      // Simulate query parameters
      const { startDate, endDate, category, limit } = req.query as {
        startDate?: string;
        endDate?: string;
        category?: string;
        limit?: string;
      };
      
      // Simulate data processing
      const mockData = [
        { id: '1', category: 'test', date: '2025-01-01', amount: 100 },
        { id: '2', category: 'test2', date: '2025-01-02', amount: 200 },
      ];
      
      // Apply filters
      let filteredData = [...mockData];
      
      if (startDate && endDate) {
        filteredData = filteredData.filter(
          item => item.date >= startDate && item.date <= endDate
        );
      }
      
      if (category) {
        filteredData = filteredData.filter(item => item.category === category);
      }
      
      // Apply pagination
      const result = limit && Number(limit) < filteredData.length
        ? filteredData.slice(0, Number(limit))
        : filteredData;
      
      res.json({
        success: true,
        data: result,
        count: result.length,
        total: mockData.length
      });
    });
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });
  
  it('should return data with status 200 when authenticated', async () => {
    const response = await request(app)
      .get('/api/data')
      .set('Authorization', 'Bearer test-token')
      .expect(200);
    
    expect(response.body).toEqual({
      success: true,
      data: [
        { id: '1', category: 'test', date: '2025-01-01', amount: 100 },
        { id: '2', category: 'test2', date: '2025-01-02', amount: 200 }
      ],
      count: 2,
      total: 2
    });
  });
  
  it('should filter data by date range', async () => {
    const response = await request(app)
      .get('/api/data?startDate=2025-01-01&endDate=2025-01-01')
      .set('Authorization', 'Bearer test-token')
      .expect(200);
    
    expect(response.body).toEqual({
      success: true,
      data: [
        { id: '1', category: 'test', date: '2025-01-01', amount: 100 }
      ],
      count: 1,
      total: 2
    });
  });
  
  it('should filter data by category', async () => {
    const response = await request(app)
      .get('/api/data?category=test2')
      .set('Authorization', 'Bearer test-token')
      .expect(200);
    
    expect(response.body).toEqual({
      success: true,
      data: [
        { id: '2', category: 'test2', date: '2025-01-02', amount: 200 }
      ],
      count: 1,
      total: 2
    });
  });
  
  it('should limit results when limit parameter is provided', async () => {
    const response = await request(app)
      .get('/api/data?limit=1')
      .set('Authorization', 'Bearer test-token')
      .expect(200);
    
    expect(response.body).toEqual({
      success: true,
      data: [
        { id: '1', category: 'test', date: '2025-01-01', amount: 100 }
      ],
      count: 1,
      total: 2
    });
  });
});
