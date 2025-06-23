import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  generateApiKey, 
  hashApiKey, 
  safeCompareKeys, 
  isValidApiKeyFormat, 
  generateApiKeyId 
} from '../src/utils/apiKeyUtils.js';

describe('API Key Utilities', () => {
  describe('generateApiKey', () => {
    it('should generate a base64 URL-safe string', async () => {
      const key = await generateApiKey();
      expect(key).toBeDefined();
      expect(typeof key).toBe('string');
      expect(key).toMatch(/^[A-Za-z0-9\-_]+$/);
    });

    it('should generate keys of the specified length', async () => {
      const key = await generateApiKey(16);
      // Base64 length calculation: 4 * Math.ceil(length / 3)
      // For 16 bytes: 4 * Math.ceil(16 / 3) = 24 characters
      expect(key.length).toBeGreaterThanOrEqual(16);
    });
  });

  describe('hashApiKey', () => {
    it('should generate a consistent SHA-256 hash', () => {
      const key = 'test-key-123';
      const hash1 = hashApiKey(key);
      const hash2 = hashApiKey(key);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/); // SHA-256 produces 64 character hex string
    });

    it('should produce different hashes for different keys', () => {
      const hash1 = hashApiKey('key1');
      const hash2 = hashApiKey('key2');
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('safeCompareKeys', () => {
    it('should correctly compare matching keys', () => {
      // Use hex-encoded strings that can be properly parsed by Buffer.from(..., 'hex')
      const key1 = '746573742d6b6579'; // 'test-key' in hex
      const key2 = '746573742d6b6579'; // 'test-key' in hex
      
      expect(safeCompareKeys(key1, key2)).toBe(true);
    });

    it('should correctly detect different keys', () => {
      // Use hex-encoded strings of the same length
      const key1 = '746573742d6b65792d31'; // 'test-key-1' in hex
      const key2 = '746573742d6b65792d32'; // 'test-key-2' in hex
      
      expect(safeCompareKeys(key1, key2)).toBe(false);
    });

    it('should be timing-safe', () => {
      // This is a basic test - timing attacks are hard to test in unit tests
      // Use valid hex strings of the same length
      const key1 = '61'.repeat(32); // 'a' repeated 64 times in hex
      const key2 = '62'.repeat(32); // 'b' repeated 64 times in hex
      
      // Just verify the function doesn't throw and returns a boolean
      expect(() => safeCompareKeys(key1, key2)).not.toThrow();
      expect(safeCompareKeys(key1, key2)).toBe(false);
    });
    
    it('should return false for invalid hex strings', () => {
      // 'test-key' is not a valid hex string
      expect(safeCompareKeys('test-key', 'test-key')).toBe(false);
      
      // Different length hex strings
      expect(safeCompareKeys('1234', '12345')).toBe(false);
    });
  });

  describe('isValidApiKeyFormat', () => {
    it('should validate correct API key formats', () => {
      const validKeys = [
        'a'.repeat(32), // Minimum length
        'a'.repeat(64), // Common length
        'a'.repeat(256), // Maximum length
        'abc123ABC456-_.~'.repeat(3), // 45 chars - valid pattern
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.~' // All valid chars
      ];

      validKeys.forEach(key => {
        expect(isValidApiKeyFormat(key)).toBe(true);
      });
    });

    it('should invalidate incorrect API key formats', () => {
      const invalidKeys = [
        '',
        ' ',
        'abc\n123', // Newline
        'abc=123', // Invalid character
        'abc/123', // Invalid character
        'a'.repeat(1025), // Too long
        'short' // Too short
      ];

      invalidKeys.forEach(key => {
        expect(isValidApiKeyFormat(key)).toBe(false);
      });
    });
  });

  describe('generateApiKeyId', () => {
    it('should generate a unique ID with timestamp', () => {
      const id1 = generateApiKeyId();
      const id2 = generateApiKeyId();
      
      expect(id1).toMatch(/^key_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });
});
