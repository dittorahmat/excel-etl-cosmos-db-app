import { vi } from 'vitest';
export const mockMsalInstance = {
    loginPopup: vi.fn().mockResolvedValue({
        account: {
            homeAccountId: 'test-account-id',
            environment: 'test',
            tenantId: 'test-tenant-id',
            username: 'test@example.com',
            localAccountId: 'local-test-account-id',
            name: 'Test User',
        },
        accessToken: 'test-access-token',
        idToken: 'test-id-token',
        scopes: ['api://test-api-scope/.default'],
        expiresOn: new Date(Date.now() + 3600000),
    }),
    logout: vi.fn().mockResolvedValue(undefined),
    getAllAccounts: vi.fn().mockReturnValue([{
            homeAccountId: 'test-account-id',
            environment: 'test',
            tenantId: 'test-tenant-id',
            username: 'test@example.com',
            localAccountId: 'local-test-account-id',
            name: 'Test User',
        }]),
    acquireTokenSilent: vi.fn().mockResolvedValue({
        accessToken: 'test-access-token',
        idToken: 'test-id-token',
        expiresOn: new Date(Date.now() + 3600000),
    }),
    setActiveAccount: vi.fn(),
    handleRedirectPromise: vi.fn().mockResolvedValue(null),
    addEventCallback: vi.fn(),
    removeEventCallback: vi.fn(),
};
export const MsalProvider = ({ children }) => children;
export const useMsal = vi.fn(() => ({
    instance: {
        ...mockMsalInstance,
        initialize: vi.fn().mockResolvedValue(undefined),
        getAllAccounts: vi.fn().mockReturnValue(mockMsalInstance.getAllAccounts()),
        handleRedirectPromise: vi.fn().mockResolvedValue(null),
        addEventCallback: vi.fn(),
        removeEventCallback: vi.fn(),
    },
    accounts: mockMsalInstance.getAllAccounts(),
    inProgress: 'none',
}));
