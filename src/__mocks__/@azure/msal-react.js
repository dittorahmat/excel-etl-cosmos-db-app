// Mock implementation of @azure/msal-react
import { vi } from 'vitest';
export const MsalProvider = ({ children }) => {
    return children;
};
export const useMsal = vi.fn().mockImplementation(() => ({
    instance: {
        loginPopup: vi.fn().mockResolvedValue({
            account: { name: 'Test User', username: 'test@example.com' },
            accessToken: 'test-access-token',
            idToken: 'test-id-token',
            scopes: ['api://test-api-scope/.default'],
        }),
        logout: vi.fn().mockResolvedValue(undefined),
        acquireTokenSilent: vi.fn().mockResolvedValue({
            accessToken: 'test-access-token',
            idToken: 'test-id-token',
            expiresOn: new Date(Date.now() + 3600000),
        }),
        getAllAccounts: vi.fn().mockReturnValue([{
                homeAccountId: 'test-account-id',
                environment: 'test',
                tenantId: 'test-tenant-id',
                username: 'test@example.com',
                localAccountId: 'local-test-account-id',
                name: 'Test User',
            }]),
    },
    accounts: [{
            homeAccountId: 'test-account-id',
            environment: 'test',
            tenantId: 'test-tenant-id',
            username: 'test@example.com',
            localAccountId: 'local-test-account-id',
            name: 'Test User',
        }],
    inProgress: 'none',
}));
export const useIsAuthenticated = vi.fn().mockReturnValue(true);
export const useAccount = vi.fn().mockReturnValue({
    homeAccountId: 'test-account-id',
    environment: 'test',
    tenantId: 'test-tenant-id',
    username: 'test@example.com',
    localAccountId: 'local-test-account-id',
    name: 'Test User',
});
