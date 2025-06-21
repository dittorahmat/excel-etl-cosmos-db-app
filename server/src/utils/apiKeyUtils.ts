import { randomBytes, createHash, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const randomBytesAsync = promisify(randomBytes);

/**
 * Generate a cryptographically secure random API key
 * @param length Length of the API key in bytes (before base64 encoding)
 * @returns Promise that resolves to the generated API key
 */
export async function generateApiKey(length = 32): Promise<string> {
  const buffer = await randomBytesAsync(length);
  return buffer.toString('base64')
    .replace(/\+/g, '-')  // Replace + with -
    .replace(/\//g, '_')  // Replace / with _
    .replace(/=+$/, '');  // Remove trailing =
}

/**
 * Hash an API key for secure storage
 * @param key The API key to hash
 * @returns Hashed key (SHA-256)
 */
export function hashApiKey(key: string): string {
  return createHash('sha256')
    .update(key)
    .digest('hex');
}

/**
 * Safely compare two API keys in constant time
 * @param key1 First key to compare
 * @param key2 Second key to compare
 * @returns True if keys match, false otherwise
 */
export function safeCompareKeys(key1: string, key2: string): boolean {
  try {
    // Ensure both inputs are treated as hex strings for comparison
    const a = Buffer.from(key1, 'hex');
    const b = Buffer.from(key2, 'hex');

    // Compare in constant time to prevent timing attacks
    // It's crucial that both buffers have the same length for timingSafeEqual
    if (a.length !== b.length) {
      return false;
    }
    return timingSafeEqual(a, b);
  } catch (error) {
    // Log the error for debugging, but return false to be safe
    console.error('Error in safeCompareKeys:', error);
    return false;
  }
}

/**
 * Validate API key format
 * @param key The API key to validate
 * @returns True if the key has a valid format
 */
export function isValidApiKeyFormat(key: string): boolean {
  if (!key || typeof key !== 'string') {
    return false;
  }

  // Check length (between 32 and 256 characters)
  if (key.length < 32 || key.length > 256) {
    return false;
  }

  // Check for invalid characters (only allow alphanumeric, dash, underscore, dot, tilde)
  // This regex matches base64 URL-safe characters: A-Z, a-z, 0-9, -, _, ., ~
  return /^[A-Za-z0-9\-_\.~]+$/.test(key);
}

/**
 * Generate a unique identifier for API keys
 * @returns A unique identifier string
 */
export function generateApiKeyId(): string {
  return `key_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
}
