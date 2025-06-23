// @vitest-environment jsdom
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

// Mock MSAL
vi.mock('@azure/msal-react', () => ({
  useMsal: () => ({
    instance: {
      acquireTokenSilent: vi.fn().mockResolvedValue({
        accessToken: 'test-token',
      }),
      loginRedirect: vi.fn(),
      logout: vi.fn(),
    },
    accounts: [
      {
        homeAccountId: 'test-account-id',
        environment: 'test',
        tenantId: 'test-tenant-id',
        username: 'test@example.com',
        name: 'Test User',
      },
    ],
  }),
  useIsAuthenticated: () => true,
  useAccount: vi.fn().mockReturnValue({
    homeAccountId: 'test-account-id',
    environment: 'test',
    tenantId: 'test-tenant-id',
    username: 'test@example.com',
    name: 'Test User',
  }),
  MsalProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock components
const Home = () => <div data-testid="home">Home Page</div>;
const Dashboard = () => <div data-testid="dashboard">Dashboard Page</div>;
const Profile = () => <div data-testid="profile">Profile Page</div>;

// Mock layout component with navigation
const AppLayout = () => {
  return (
    <div>
      <nav>
        <a href="/" data-testid="home-link">Home</a>
        <a href="/dashboard" data-testid="dashboard-link">Dashboard</a>
        <a href="/profile" data-testid="profile-link">Profile</a>
      </nav>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </div>
  );
};

// Test component with router
const AppWithRouter = () => (
  <MemoryRouter initialEntries={['/']}>
    <AppLayout />
  </MemoryRouter>
);

describe('App Routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  it('renders home page by default', async () => {
    render(<AppWithRouter />);
    
    // Check if home page is rendered by default
    expect(screen.getByTestId('home')).toBeInTheDocument();
  });

  it('navigates to dashboard page', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppLayout />
      </MemoryRouter>
    );
    
    // Click dashboard link
    const dashboardLink = screen.getByTestId('dashboard-link');
    dashboardLink.click();
    
    // Check if dashboard page is rendered
    await waitFor(() => {
      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    });
  });

  it('navigates to profile page', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppLayout />
      </MemoryRouter>
    );
    
    // Click profile link
    const profileLink = screen.getByTestId('profile-link');
    profileLink.click();
    
    // Check if profile page is rendered
    await waitFor(() => {
      expect(screen.getByTestId('profile')).toBeInTheDocument();
    });
  });
});
