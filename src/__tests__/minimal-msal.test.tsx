// @vitest-environment jsdom
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import '@testing-library/jest-dom';

// Mock MSAL
vi.mock('@azure/msal-react', () => ({
  useMsal: () => ({
    instance: {
      acquireTokenSilent: vi.fn().mockResolvedValue({
        accessToken: 'test-token',
      }),
    },
    accounts: [
      {
        homeAccountId: 'test-account-id',
        environment: 'test',
        tenantId: 'test-tenant-id',
        username: 'test@example.com',
      },
    ],
  }),
  useIsAuthenticated: () => true,
  useAccount: vi.fn().mockReturnValue({
    homeAccountId: 'test-account-id',
    environment: 'test',
    tenantId: 'test-tenant-id',
    username: 'test@example.com',
  }),
  MsalProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

// Minimal component that uses MSAL
const MsalComponent: React.FC = () => {
  return <div data-testid="msal-component">MSAL Component</div>;
};

describe('Minimal MSAL Test', () => {
  beforeAll(() => {
    // Set any required environment variables
    process.env.NODE_ENV = 'test';
    process.env.REACT_APP_API_BASE_URL = 'http://localhost:3001';
  });

  it('renders without crashing', () => {
    render(<MsalComponent />);
    expect(screen.getByTestId('msal-component')).to.exist;
    expect(screen.getByTestId('msal-component').textContent).to.include('MSAL Component');
  });
});
