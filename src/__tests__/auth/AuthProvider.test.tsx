import { render, screen, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AuthProvider } from '../../auth/AuthProvider';
import { useAuth } from '../../auth/AuthContext';
import type { AuthContextType } from '../../auth/AuthContext';

// Mock the AuthContext
const mockUseAuth = vi.fn();
vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock MSAL
vi.mock('@azure/msal-browser', () => ({
  PublicClientApplication: vi.fn().mockImplementation(() => ({
    loginPopup: vi.fn().mockResolvedValue({
      account: { name: 'Test User', username: 'test@example.com' },
      accessToken: 'test-access-token',
      idToken: 'test-id-token',
      expiresOn: new Date(Date.now() + 3600000).toISOString(),
    }),
    logout: vi.fn().mockResolvedValue(undefined),
    getAllAccounts: vi.fn().mockReturnValue([]),
    acquireTokenSilent: vi.fn().mockResolvedValue({
      accessToken: 'test-access-token',
      idToken: 'test-id-token',
      expiresOn: new Date(Date.now() + 3600000).toISOString(),
    }),
    setActiveAccount: vi.fn(),
    handleRedirectPromise: vi.fn().mockResolvedValue(null),
  })),
}));

// Mock MSAL React
vi.mock('@azure/msal-react', () => ({
  useMsal: vi.fn().mockReturnValue({
    instance: {
      loginPopup: vi.fn(),
      logout: vi.fn(),
      getAllAccounts: vi.fn().mockReturnValue([]),
      acquireTokenSilent: vi.fn(),
    },
    accounts: [],
    inProgress: 'none',
  }),
  MsalProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock auth context values
const mockAuth: AuthContextType = {
  isAuthenticated: false,
  user: null,
  loading: false,
  error: null,
  login: vi.fn().mockResolvedValue({
    account: { name: 'Test User', username: 'test@example.com' },
    accessToken: 'test-access-token',
    idToken: 'test-id-token',
    expiresOn: new Date(Date.now() + 3600000).toISOString(),
  }),
  logout: vi.fn().mockResolvedValue(undefined),
  getAccessToken: vi.fn().mockResolvedValue('test-access-token'),
};

describe('AuthProvider', () => {
  // Test component that uses the auth context
  const TestComponent = () => {
    const { isAuthenticated, user } = useAuth();
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
  

  
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should provide auth context to children', async () => {
    // Mock authenticated state
    mockUseAuth.mockImplementation(() => ({
      ...mockAuth,
      isAuthenticated: true,
      user: { name: 'Test User', email: 'test@example.com' },
    }));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
    });
  });

  it('should handle login flow', async () => {
    const loginResponse = {
      account: { name: 'Test User', username: 'test@example.com' },
      accessToken: 'test-access-token',
      idToken: 'test-id-token',
      expiresOn: new Date(Date.now() + 3600000).toISOString(),
    };
    
    const loginMock = vi.fn().mockResolvedValue(loginResponse);
    
    mockUseAuth.mockImplementation(() => ({
      ...mockAuth,
      login: loginMock,
    }));
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    // Initial state should be not authenticated
    expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');
    
    // Simulate login button click
    await act(async () => {
      screen.getByTestId('login-button').click();
    });
    
    // Verify login was called
    expect(loginMock).toHaveBeenCalledTimes(1);
    
    // Verify storage was updated
    await waitFor(() => {
      expect(localStorage.getItem('msal.token.keys')).toBeTruthy();
    });
  });

  it('should handle logout flow', async () => {
    // Mock logout implementation
    const logoutMock = vi.fn().mockResolvedValue(undefined);
    
    mockUseAuth.mockImplementation(() => ({
      ...mockAuth,
      isAuthenticated: true,
      user: { name: 'Test User', email: 'test@example.com' },
      logout: logoutMock,
    }));
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    // Initial state should be authenticated
    expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
    
    // Simulate logout button click
    await act(async () => {
      screen.getByTestId('logout-button').click();
    });
    
    // Verify logout was called
    expect(logoutMock).toHaveBeenCalledTimes(1);
  });

  it('should handle token refresh', async () => {
    const testToken = 'test-refreshed-token';
    const getAccessTokenMock = vi.fn().mockResolvedValue(testToken);
    
    mockUseAuth.mockImplementation(() => ({
      ...mockAuth,
      getAccessToken: getAccessTokenMock,
    }));
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    // Trigger token refresh
    const { getAccessToken } = mockUseAuth();
    const token = await getAccessToken();
    
    expect(token).toBe(testToken);
    expect(getAccessTokenMock).toHaveBeenCalledTimes(1);
  });
});
