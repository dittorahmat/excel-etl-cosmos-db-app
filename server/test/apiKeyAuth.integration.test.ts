/// <reference types="vitest" />
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import type { Server } from 'http';
import request from 'supertest';
import type { Application } from 'express';
import express from 'express';
import { createServer } from 'http';
import { apiKeyAuth } from '../src/middleware/apiKeyAuth.js';
import { ApiKeyRepository } from '../src/repositories/apiKeyRepository.js';

vi.mock('../src/repositories/apiKeyRepository.js');

describe('API Key Authentication Integration', () => {
  let app: Application;
  let server: Server;
  let testRepository: ApiKeyRepository;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    testRepository = new ApiKeyRepository({} as any);
    app.use(apiKeyAuth(testRepository));
    app.get('/protected', (req, res) => {
      res.status(200).json({ message: 'Authenticated' });
    });
    server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(resolve));
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if no API key is provided', async () => {
    const response = await request(server).get('/protected');
    expect(response.status).toBe(401);
  });

  it('should return 401 for invalid API key format', async () => {
    const response = await request(server).get('/protected').set('Authorization', 'InvalidFormat');
    expect(response.status).toBe(401);
  });

  it('should return 200 for valid API key in header', async () => {
    vi.mocked(testRepository.validateApiKey).mockResolvedValueOnce({ isValid: true, key: {} as any });
    const response = await request(server).get('/protected').set('Authorization', 'ApiKey valid-key');
    expect(response.status).toBe(200);
  });

  it('should return 401 for revoked API key', async () => {
    vi.mocked(testRepository.validateApiKey).mockResolvedValueOnce({ isValid: false, error: 'API key has been revoked' });
    const response = await request(server).get('/protected').set('Authorization', 'ApiKey revoked-key');
    expect(response.status).toBe(401);
  });

  it('should return 401 for invalid IP address', async () => {
    vi.mocked(testRepository.validateApiKey).mockResolvedValueOnce({ isValid: false, error: 'Access denied from this IP address' });
    const response = await request(server).get('/protected').set('Authorization', 'ApiKey valid-key');
    expect(response.status).toBe(401);
  });

  it('should return 401 for non-existent API key', async () => {
    vi.mocked(testRepository.validateApiKey).mockResolvedValueOnce({ isValid: false, error: 'API key not found' });
    const response = await request(server).get('/protected').set('Authorization', 'ApiKey non-existent-key');
    expect(response.status).toBe(401);
  });
});