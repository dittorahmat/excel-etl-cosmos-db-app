import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import AuthProvider from '../../auth/AuthProvider';
import { MsalProvider } from '@azure/msal-react';

// Set test timeout to 30 seconds to handle async operations
vi.setConfig({ testTimeout: 30000 });

// Mock MSAL instance with minimal implementation
const mockMsalInstance = {
  loginPopup: vi.fn().mockResolvedValue({
    account: { username: 'test@example.com' },
    accessToken: 'test-token',
    idToken: 'test-id-token',
  }),
  logout: vi.fn().mockResolvedValue(undefined),
  getAllAccounts: vi.fn().mockReturnValue([{ username: 'test@example.com' }]),
  acquireTokenSilent: vi.fn().mockResolvedValue({
    accessToken: 'test-token',
    idToken: 'test-id-token',
    expiresOn: new Date(Date.now() + 3600000),
  }),
  setActiveAccount: vi.fn(),
  handleRedirectPromise: vi.fn().mockResolvedValue(null),
  addEventCallback: vi.fn().mockReturnValue('callback-id'),
  removeEventCallback: vi.fn(),
  initialize: vi.fn().mockResolvedValue(undefined),
};

// Mock MSAL React module
vi.mock('@azure/msal-react', () => ({
  MsalProvider: ({ children }) => children,
  useMsal: () => ({
    instance: mockMsalInstance,
    accounts: mockMsalInstance.getAllAccounts(),
    inProgress: 'none',
  }),
  useAccount: () => ({
    username: 'test@example.com',
  }),
}));

// Simple test component
const TestComponent: React.FC = () => (
  <div>
    <div data-testid="auth-status">Test Component</div>
  </div>
);



describe('AuthProvider', () => {
  // Track memory usage
  const memoryUsage: number[] = [];
  
  beforeAll(() => {
    // Disable debug logging for tests
    vi.stubEnv('NODE_ENV', 'test');
    
    // Log initial memory usage
    if (global.gc) {
      global.gc();
      const used = process.memoryUsage().heapUsed / 1024 / 1024;
      memoryUsage.push(used);
      console.log(`[Memory] Before all tests: ${used.toFixed(2)} MB`);
    }
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    
    // Log memory usage after each test
    if (global.gc) {
      global.gc();
      const used = process.memoryUsage().heapUsed / 1024 / 1024;
      memoryUsage.push(used);
      console.log(`[Memory] After test: ${used.toFixed(2)} MB`);
    }
  });

  afterAll(() => {
    vi.resetAllMocks();
    vi.unstubAllEnvs();
    
    // Log final memory usage
    if (global.gc) {
      global.gc();
      const used = process.memoryUsage().heapUsed / 1024 / 1024;
      memoryUsage.push(used);
      console.log(`[Memory] After all tests: ${used.toFixed(2)} MB`);
      
      // Check for memory leaks
      if (memoryUsage.length > 1) {
        const diff = memoryUsage[memoryUsage.length - 1] - memoryUsage[0];
        
        if (diff > 10) {
          console.warn('[Memory] Possible memory leak detected!');
        }
      }
    }
  });

  it('should render children', async () => {
    // Test with minimal props and no interactions
    render(
      <MsalProvider instance={mockMsalInstance}>
        <AuthProvider>
          <div data-testid="test-child">Test Child</div>
        </AuthProvider>
      </MsalProvider>
    );

    expect(screen.getByTestId('test-child')).toBeInTheDocument();
  });

  it('should initialize without errors', async () => {
    // Simple test to check if AuthProvider initializes without throwing
    expect(() => {
      render(
        <MsalProvider instance={mockMsalInstance}>
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        </MsalProvider>
      );
    }).not.toThrow();
  });

  // Add more focused tests one at a time after confirming memory stability
});