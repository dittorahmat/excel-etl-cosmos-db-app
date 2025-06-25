import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterAll, beforeAll } from 'vitest';
import { AuthProvider, useAuth } from '../../auth/AuthProvider';

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

// Test component that uses the auth context
const TestComponent = () => {
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

describe('AuthProvider', () => {
  beforeAll(() => {
    vi.stubEnv('DEBUG', 'msal*');
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render children', () => {
    render(
      <AuthProvider>
        <div data-testid="test-child">Test Child</div>
      </AuthProvider>
    );

    expect(screen.getByTestId('test-child')).toBeInTheDocument();
  });

  it('should provide auth context', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
  });

  it('should handle login', async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    const loginButton = screen.getByTestId('login-button');
    await user.click(loginButton);

    expect(mockMsalInstance.loginPopup).toHaveBeenCalled();
  });

  it('should handle logout', async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    const logoutButton = screen.getByTestId('logout-button');
    await user.click(logoutButton);

    expect(mockMsalInstance.logout).toHaveBeenCalled();
  });

  it('should handle token refresh', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Simulate token expiration
    mockMsalInstance.acquireTokenSilent.mockResolvedValueOnce({
      accessToken: 'new-access-token',
      idToken: 'new-id-token',
      expiresOn: new Date(Date.now() + 3600000),
    });

    // Wait for token refresh to complete
    await waitFor(() => {
      expect(mockMsalInstance.acquireTokenSilent).toHaveBeenCalled();
    });
  });

  it('should handle errors during login', async () => {
    const user = userEvent.setup();
    const errorMessage = 'Login failed';
    mockMsalInstance.loginPopup.mockRejectedValueOnce(new Error(errorMessage));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    const loginButton = screen.getByTestId('login-button');
    await user.click(loginButton);

    // Wait for error state to update
    await waitFor(() => {
      expect(screen.getByText(`Error: ${errorMessage}`)).toBeInTheDocument();
    });
  });
});
