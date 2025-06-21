import { vi } from 'vitest';

export const ConfidentialClientApplication = vi.fn(() => ({
  acquireTokenByClientCredential: vi.fn().mockResolvedValue({
    accessToken: 'mock-access-token',
    expiresOn: new Date(Date.now() + 3600 * 1000), // 1 hour from now
  }),
  acquireTokenOnBehalfOf: vi.fn().mockResolvedValue({
    accessToken: 'mock-access-token',
    expiresOn: new Date(Date.now() + 3600 * 1000),
  }),
  getAccountByHomeId: vi.fn().mockReturnValue(null),
  getAccountByLocalId: vi.fn().mockReturnValue(null),
  getAccountByUsername: vi.fn().mockReturnValue(null),
  getAllAccounts: vi.fn().mockReturnValue([]),
  getTokenCache: vi.fn().mockReturnValue({
    serialize: vi.fn(),
    deserialize: vi.fn(),
    addAccount: vi.fn(),
    removeAccount: vi.fn(),
    addCacheRecord: vi.fn(),
    readCache: vi.fn(),
    writeCache: vi.fn(),
  }),
}));

export const LogLevel = {
  Error: 3,
  Warning: 2,
  Info: 1,
  Verbose: 0,
};