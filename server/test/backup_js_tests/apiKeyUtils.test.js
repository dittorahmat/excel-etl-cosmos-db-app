import { describe, it, expect } from 'vitest';
import { generateApiKey, hashApiKey, safeCompareKeys, isValidApiKeyFormat, generateApiKeyId } from '../src/utils/apiKeyUtils';
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
            const key1 = 'test-key';
            const key2 = 'test-key';
            expect(safeCompareKeys(key1, key2)).toBe(true);
        });
        it('should correctly detect different keys', () => {
            const key1 = 'test-key-1';
            const key2 = 'test-key-2';
            expect(safeCompareKeys(key1, key2)).toBe(false);
        });
        it('should be timing-safe', () => {
            // This is a basic test - timing attacks are hard to test in unit tests
            const key1 = 'a'.repeat(100);
            const key2 = 'b'.repeat(100);
            // Just verify the function doesn't throw and returns a boolean
            expect(() => safeCompareKeys(key1, key2)).not.toThrow();
            expect(safeCompareKeys(key1, key2)).toBe(false);
        });
    });
    describe('isValidApiKeyFormat', () => {
        it('should validate correct API key formats', () => {
            const validKeys = [
                'a'.repeat(32), // Minimum length
                'a'.repeat(64), // Standard length
                'a'.repeat(256), // Maximum length
                'abc123ABC456-_.~' + 'x'.repeat(32 - 14) // Ensure minimum length with valid chars
            ];
            validKeys.forEach(key => {
                expect(isValidApiKeyFormat(key)).toBe(true, `Expected key to be valid: ${key}`);
            });
        });
        it('should invalidate incorrect API key formats', () => {
            const invalidKeys = [
                '',
                ' ',
                'a'.repeat(31), // Too short
                'a'.repeat(257), // Too long
                'abc\n123' + 'x'.repeat(30), // Newline
                'abc=123' + 'x'.repeat(30), // Invalid character
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
