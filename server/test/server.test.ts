import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createApp } from '../src/server';

// Mock Azure services
vi.mock('../src/config/azure', () => ({
  initializeBlobStorage: vi.fn().mockResolvedValue({
    blobServiceClient: {
      getContainerClient: vi.fn().mockReturnValue({
        createIfNotExists: vi.fn().mockResolvedValue({}),
      }),
    },
  }),
  initializeCosmosDB: vi.fn().mockResolvedValue({
    container: {
      items: {
        create: vi.fn().mockResolvedValue({ resource: { id: 'test-id' } }),
      },
    },
  }),
}));

describe('Server', () => {
  let app: Express.Application;

  beforeAll(async () => {
    app = createApp();
  });

  afterAll(() => {
    vi.clearAllMocks();
  });

  describe('GET /health', () => {
    it('should return 200 and status ok', async () => {
      const res = await request(app).get('/health');
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'ok');
      expect(res.body).toHaveProperty('environment');
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for unknown routes', async () => {
      const res = await request(app).get('/non-existent-route');
      
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error', 'Not Found');
    });
  });
});
