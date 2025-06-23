// @vitest-environment jsdom
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
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

// Simple component that uses React Router
const HomePage = () => <div data-testid="home-page">Home Page</div>;
const AboutPage = () => <div data-testid="about-page">About Page</div>;

const AppWithRouter = () => (
  <MemoryRouter initialEntries={['/']}>
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/about" element={<AboutPage />} />
    </Routes>
  </MemoryRouter>
);

describe('App with Router', () => {
  it('renders home page by default', () => {
    render(<AppWithRouter />);
    expect(screen.getByTestId('home-page')).to.exist;
    expect(screen.getByTestId('home-page').textContent).to.include('Home Page');
  });
});
