import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, act, waitFor } from '@testing-library/react';
import { render } from '../../../test-utils';
import { Navbar } from '../Navbar';

// Mock the useAuth hook
const mockUseAuth = vi.fn().mockReturnValue({
  isAuthenticated: false,
  user: null,
  login: vi.fn(),
  logout: vi.fn(),
  getAccessToken: vi.fn().mockResolvedValue('test-token'),
});

vi.mock('../../../auth/AuthProvider', () => ({
  useAuth: () => mockUseAuth(),
}));

// Helper function to wait for all async operations to complete
const waitForRender = async (ms = 0) => {
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, ms));
  });
};

describe('Navbar', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    // Reset the mock implementation
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
      getAccessToken: vi.fn().mockResolvedValue('test-token'),
    });
  });

  afterEach(async () => {
    // Wait for any pending operations to complete
    await waitForRender();
  });

  it('renders without crashing', async () => {
    const { user } = render(<Navbar />);
    await waitForRender(100);
    expect(screen.getByText('Excel ETL App')).toBeInTheDocument();
  });

  it('shows sign in button when not authenticated', async () => {
    const { user } = render(<Navbar />);
    await waitForRender(100);
    
    const signInButton = await screen.findByRole('button', { name: /sign in/i });
    expect(signInButton).toBeInTheDocument();
  });

  it('calls onMenuClick when menu button is clicked', async () => {
    const mockOnMenuClick = vi.fn();
    const { user } = render(<Navbar onMenuClick={mockOnMenuClick} />);
    await waitForRender(100);
    
    const menuButton = await screen.findByRole('button', { name: /menu/i });
    await act(async () => {
      fireEvent.click(menuButton);
    });
    
    await waitForRender(100);
    expect(mockOnMenuClick).toHaveBeenCalledTimes(1);
  });

  it('shows user menu when authenticated', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: {
        name: 'Test User',
        email: 'test@example.com',
      },
      login: vi.fn(),
      logout: vi.fn(),
      getAccessToken: vi.fn().mockResolvedValue('test-token'),
    });

    const { user } = render(<Navbar />);
    await waitForRender(100);

    const userName = await screen.findByText(/test user/i);
    const settingsButton = await screen.findByRole('button', { name: /open settings/i });
    
    expect(userName).toBeInTheDocument();
    expect(settingsButton).toBeInTheDocument();
  });

  it('calls logout when logout is clicked', async () => {
    const mockLogout = vi.fn();
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: {
        name: 'Test User',
        email: 'test@example.com',
      },
      login: vi.fn(),
      logout: mockLogout,
      getAccessToken: vi.fn().mockResolvedValue('test-token'),
    });

    const { user } = render(<Navbar />);
    await waitForRender(100);

    // Open the user menu
    const settingsButton = await screen.findByRole('button', { name: /open settings/i });
    await act(async () => {
      fireEvent.click(settingsButton);
    });
    
    await waitForRender(100);
    
    // Click the logout button
    const logoutButton = await screen.findByRole('menuitem', { name: /logout/i });
    await act(async () => {
      fireEvent.click(logoutButton);
    });
    
    await waitForRender(100);
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
