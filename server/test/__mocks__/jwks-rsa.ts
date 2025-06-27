import type { JwksClient } from 'jwks-rsa';

export const mockGetSigningKey = vi.fn();

// Create a mock implementation that matches the JwksClient interface
const mockJwksClient = vi.fn().mockImplementation((): Partial<JwksClient> => ({
  getSigningKey: mockGetSigningKey as unknown as JwksClient['getSigningKey'],
}));

export default mockJwksClient;
