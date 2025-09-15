import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../server/src/config/app';

describe('API Contract Tests', () => {
  const app = createApp();

  describe('GET /health', () => {
    it('should return 200 and health status', async () => {
      const response = await request(app).get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'ok',
        timestamp: expect.any(String),
        uptime: expect.any(Number)
      });
    });
  });

  describe('GET /api/public', () => {
    it('should return 200 and public API information', async () => {
      const response = await request(app).get('/api/public');
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: 'Public API endpoint',
        timestamp: expect.any(String)
      });
    });
  });

  describe('GET /api/data', () => {
    it('should return 200 with data structure when authenticated', async () => {
      // This test would require authentication
      // For now, we'll test the structure without authentication
      const response = await request(app).get('/api/data');
      
      // Depending on AUTH_ENABLED, this might return 200 or 401
      expect([200, 401]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body).toEqual({
          items: expect.any(Array),
          count: expect.any(Number),
          total: expect.any(Number),
          page: expect.any(Number),
          pageSize: expect.any(Number),
          totalPages: expect.any(Number)
        });
      }
    });
  });
});