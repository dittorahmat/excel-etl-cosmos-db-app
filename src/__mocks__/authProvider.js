import { vi } from 'vitest';
export const mockUseAuth = vi.fn().mockReturnValue({
    isAuthenticated: false,
    user: null,
    login: vi.fn(),
    logout: vi.fn(),
    loading: false,
    error: null,
    getAccessToken: vi.fn().mockResolvedValue('test-token'),
});
export const AuthProvider = ({ children }) => children;
