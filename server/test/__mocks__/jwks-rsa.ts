import { vi } from 'vitest';
import jwksClient from 'jwks-rsa';

export const mockGetSigningKey = vi.fn();

const mockJwksClient = vi.fn().mockImplementation(() => ({
  getSigningKey: mockGetSigningKey,
}));

export default mockJwksClient;
