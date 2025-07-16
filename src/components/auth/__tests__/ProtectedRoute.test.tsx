import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ProtectedRoute } from '../ProtectedRoute';
import { useAuth } from '@/auth/useAuth';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// Mock the useAuth hook
vi.mock('@/auth/useAuth', () => ({
  useAuth: vi.fn(),
}));

// Mock react-router-dom's useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders children when authenticated and loading is false', async () => {
    (useAuth as vi.Mock).mockReturnValue({
      isAuthenticated: true,
      loading: false,
      user: { name: 'Test User' },
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <div>Protected Content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('shows loading state when authenticating', () => {
    (useAuth as vi.Mock).mockReturnValue({
      isAuthenticated: false,
      loading: true,
      user: null,
    });

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByText('Authenticating...')).toBeInTheDocument();
  });

  it('redirects to login when not authenticated and loading is false', async () => {
    (useAuth as vi.Mock).mockReturnValue({
      isAuthenticated: false,
      loading: false,
      user: null,
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <div>Protected Content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
    });
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders unauthorized message if user does not have required role', async () => {
    (useAuth as vi.Mock).mockReturnValue({
      isAuthenticated: true,
      loading: false,
      user: { name: 'Test User', idTokenClaims: { roles: ['user'] } },
    });

    render(
      <MemoryRouter>
        <ProtectedRoute requiredRole="admin">
          <div>Protected Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByText('Unauthorized Access')).toBeInTheDocument();
    expect(screen.getByText("You don't have permission to access this page.")).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders children if user has the required role', async () => {
    (useAuth as vi.Mock).mockReturnValue({
      isAuthenticated: true,
      loading: false,
      user: { name: 'Test User', idTokenClaims: { roles: ['user', 'admin'] } },
    });

    render(
      <MemoryRouter>
        <ProtectedRoute requiredRole="admin">
          <div>Protected Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(screen.queryByText('Unauthorized Access')).not.toBeInTheDocument();
  });
});
