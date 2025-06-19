import { vi } from 'vitest';

// Mock for jwks-rsa library
export default vi.fn().mockImplementation(() => ({
  getSigningKey: vi.fn().mockImplementation((kid, callback) => {
    // Mock a valid key
    if (kid === 'test-key-id') {
      callback(null, {
        getPublicKey: () => 'test-public-key',
      });
    } else {
      // Simulate key not found
      callback(new Error('Key not found'), null);
    }
  }),
}));
