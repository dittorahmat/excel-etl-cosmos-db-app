import { createHash } from 'crypto';

/**
 * Hashes an API key for secure storage
 * @param key The API key to hash
 * @returns Hashed key as a hex string
 */
export function hashApiKey(key: string): string {
  if (!key) {
    throw new Error('API key is required for hashing');
  }
  return createHash('sha256').update(key).digest('hex');
}

/**
 * Compares a plain text key with a hashed key in constant time
 * @param plainKey The plain text key to check
 * @param hashedKey The hashed key to compare against
 * @returns True if the keys match, false otherwise
 */
export function compareApiKey(plainKey: string, hashedKey: string): boolean {
  if (!plainKey || !hashedKey) {
    return false;
  }
  
  const hashedInput = hashApiKey(plainKey);
  return hashedInput === hashedKey;
}
