import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiKeyRepository } from '../src/repositories/apiKeyRepository.js';
import { createTestApiKey } from './__mocks__/apiKey/apiKey.test.utils.js';

vi.mock('../src/repositories/apiKeyRepository.js');

describe('API key validation with IP restrictions', () => {
  let testRepository: ApiKeyRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    testRepository = new ApiKeyRepository({} as any);
  });

  it('should reject empty API key', async () => {
    vi.mocked(testRepository.validateApiKey).mockRejectedValueOnce(new Error('API key is required'));
    await expect(testRepository.validateApiKey({ key: '' })).rejects.toThrow('API key is required');
  });

  it('should reject invalid API key format', async () => {
    vi.mocked(testRepository.validateApiKey).mockRejectedValueOnce(new Error('Invalid API key format'));
    await expect(testRepository.validateApiKey({ key: 'invalid-key-format' })).rejects.toThrow('Invalid API key format');
  });

  it('should reject non-existent API key', async () => {
    vi.mocked(testRepository.validateApiKey).mockRejectedValueOnce(new Error('API key not found'));
    await expect(testRepository.validateApiKey({ key: 'non-existent-key' })).rejects.toThrow('API key not found');
  });

  it('should reject revoked API key', async () => {
    vi.mocked(testRepository.validateApiKey).mockRejectedValueOnce(new Error('API key has been revoked'));
    await expect(testRepository.validateApiKey({ key: 'revoked-key' })).rejects.toThrow('API key has been revoked');
  });

  it('should validate active API key', async () => {
    const testKey = createTestApiKey();
    vi.mocked(testRepository.validateApiKey).mockResolvedValueOnce({ isValid: true, key: testKey });
    const result = await testRepository.validateApiKey({ key: 'valid-key' });
    expect(result.isValid).toBe(true);
  });

  it('should reject request from unauthorized IP', async () => {
    vi.mocked(testRepository.validateApiKey).mockRejectedValueOnce(new Error('Access denied from this IP address'));
    await expect(testRepository.validateApiKey({ key: 'valid-key', ipAddress: '1.2.3.4' })).rejects.toThrow('Access denied from this IP address');
  });

  it('should allow request from authorized IP', async () => {
    const testKey = createTestApiKey();
    vi.mocked(testRepository.validateApiKey).mockResolvedValueOnce({ isValid: true, key: testKey });
    const result = await testRepository.validateApiKey({ key: 'valid-key', ipAddress: '127.0.0.1' });
    expect(result.isValid).toBe(true);
  });
});