import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterAll, beforeAll } from 'vitest';
import { AuthProvider, useAuth } from '../../auth/AuthProvider';
import { MsalProvider, useMsal } from '@azure/msal-react';

vi.mock('@azure/msal-react', () => ({
  MsalProvider: ({ children }) => children,
  useMsal: () => ({
    instance: mockMsalInstance,
    accounts: mockMsalInstance.getAllAccounts(),
    inProgress: 'none',
  }),
}));

// Test component that uses the auth context
const TestComponent = () => {
  const { instance, accounts } = useMsal();
  const { isAuthenticated, login, logout, loading, error } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error?.message}</div>;

  return (
    <div>
      <div data-testid="auth-status">
        {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
      </div>
      <button onClick={login} data-testid="login-button">
        Login
      </button>
      <button onClick={logout} data-testid="logout-button">
        Logout
      </button>
    </div>
  );
};

// Import the mock instance from setupTests
const { mockMsalInstance } = vi.hoisted(() => ({
  mockMsalInstance: {
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
  }
}));

// Set up the mock instance on window for test-utils
global.window.msalInstance = mockMsalInstance as any;


  });
});
