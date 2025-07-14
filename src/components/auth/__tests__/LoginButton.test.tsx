import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LoginButton } from '../LoginButton';
import { useAuth } from '@/auth/useAuth';

// Mock the useAuth hook
vi.mock('../../auth/useAuth', () => ({
  useAuth: vi.fn(),
}));

describe('LoginButton', () => {
  it('renders sign-in button when not authenticated', () => {
    (useAuth as vi.Mock).mockReturnValue({
      isAuthenticated: false,
      login: vi.fn(),
      logout: vi.fn(),
      user: null,
    });
    render(<LoginButton />);
    expect(screen.getByRole('button', { name: /Sign in with Microsoft/i })).toBeInTheDocument();
  });

  it('calls login when sign-in button is clicked', () => {
    const mockLogin = vi.fn();
    (useAuth as vi.Mock).mockReturnValue({
      isAuthenticated: false,
      login: mockLogin,
      logout: vi.fn(),
      user: null,
    });
    render(<LoginButton />);
    fireEvent.click(screen.getByRole('button', { name: /Sign in with Microsoft/i }));
    expect(mockLogin).toHaveBeenCalledTimes(1);
  });

  it('renders welcome message and sign-out button when authenticated', () => {
    (useAuth as vi.Mock).mockReturnValue({
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      user: { name: 'Test User' },
    });
    render(<LoginButton />);
    expect(screen.getByText(/Welcome, Test User/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign out/i })).toBeInTheDocument();
  });

  it('calls logout when sign-out button is clicked', () => {
    const mockLogout = vi.fn();
    (useAuth as vi.Mock).mockReturnValue({
      isAuthenticated: true,
      login: vi.fn(),
      logout: mockLogout,
      user: { name: 'Test User' },
    });
    render(<LoginButton />);
    fireEvent.click(screen.getByRole('button', { name: /Sign out/i }));
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
