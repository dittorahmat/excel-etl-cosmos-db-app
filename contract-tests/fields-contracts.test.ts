import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../server/src/config/app';

describe('Fields API Contract Tests', () => {
  const app = createApp();
  
  describe('GET /api/fields', () => {
    it('should return field information', async () => {
      const response = await request(app).get('/api/fields');
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: expect.any(Boolean),
        fields: expect.any(Array)
      });
      
      // If fields are returned, they should have the correct structure
      if (response.body.fields.length > 0) {
        expect(response.body.fields[0]).toEqual({
          name: expect.any(String),
          type: expect.any(String),
          label: expect.any(String)
        });
      }
    });
    
    it('should support relatedTo query parameter', async () => {
      const response = await request(app)
        .get('/api/fields')
        .query({ relatedTo: 'test-field' });
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: expect.any(Boolean),
        fields: expect.any(Array)
      });
    });
  });
});