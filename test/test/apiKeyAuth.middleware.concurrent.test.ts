// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request, Response } from 'express';
import { apiKeyAuth } from '../src/middleware/apiKeyAuth.js';
import { ApiKeyRepository } from '../src/repositories/apiKeyRepository.js';

vi.mock('../src/repositories/apiKeyRepository.js');

describe('API Key Authentication Middleware - Concurrent Validation', () => {
  let testRepository: ApiKeyRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    testRepository = new ApiKeyRepository({} as any);
  });

  it('should handle concurrent API key validations', async () => {
    const mockApiKey1 = { 
      id: 'key-1', 
      userId: 'user-1', 
      name: 'Key 1',
      keyHash: 'hashed-key-1',
      isActive: true,
      allowedIps: ['*'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastUsedAt: null,
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      lastUsedFromIp: null
    };
    
    const mockApiKey2 = { 
      id: 'key-2', 
      userId: 'user-2', 
      name: 'Key 2',
      keyHash: 'hashed-key-2',
      isActive: true,
      allowedIps: ['*'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastUsedAt: null,
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      lastUsedFromIp: null
    };

    // Mock the validateApiKey method
type ValidateApiKeyParams = Parameters<typeof testRepository.validateApiKey>[0];
(testRepository.validateApiKey as any).mockImplementation(async (params: ValidateApiKeyParams) => {
      if (params.key === 'test-key-1') {
        return { isValid: true, key: mockApiKey1 };
      }
      if (params.key === 'test-key-2') {
        return { isValid: true, key: mockApiKey2 };
      }
      return { isValid: false, error: 'Invalid API key' };
    });

    const req1 = { headers: { authorization: 'ApiKey test-key-1' } } as Request;
    const req2 = { headers: { authorization: 'ApiKey test-key-2' } } as Request;
    const res = {} as Response;

    const next1 = vi.fn();
    const next2 = vi.fn();

    await Promise.all([
      apiKeyAuth(testRepository)(req1, res, next1),
      apiKeyAuth(testRepository)(req2, res, next2),
    ]);

    expect(next1).toHaveBeenCalledWith();
    expect(next2).toHaveBeenCalledWith();
    expect((req1 as any).apiKey).toEqual(mockApiKey1);
    expect((req2 as any).apiKey).toEqual(mockApiKey2);
  });

  it('should handle concurrent validation with rate limiting', async () => {
    const mockApiKey = { 
      id: 'rate-limited-key', 
      userId: 'user-1', 
      name: 'Rate Limited Key',
      keyHash: 'hashed-rate-limited-key',
      isActive: true,
      allowedIps: ['*'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastUsedAt: null,
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      lastUsedFromIp: null
    };
    vi.mocked(testRepository.validateApiKey).mockResolvedValue({ isValid: true, key: mockApiKey });

    const requests = Array(5).fill(null).map(() => ({
      req: { headers: { authorization: 'ApiKey test-key' } } as Request,
      res: {} as Response,
      next: vi.fn(),
    }));

    await Promise.all(requests.map(({ req, res, next }) => apiKeyAuth(testRepository)(req, res, next)));

    requests.forEach(({ next, req }) => {
      expect(next).toHaveBeenCalledWith();
      expect((req as any).apiKey).toEqual(mockApiKey);
    });
  });
});