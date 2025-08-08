import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import LoginPage from './LoginPage';
import { useAuth } from '../auth/useAuth';
// Mock the useAuth hook
vi.mock('../auth/useAuth', () => ({
    useAuth: vi.fn(),
}));
describe('LoginPage', () => {
    const mockLogin = vi.fn();
    beforeEach(() => {
        // Reset the mock before each test
        mockLogin.mockReset();
        useAuth.mockReturnValue({
            login: mockLogin,
            isAuthenticated: false,
            user: null,
            loading: false,
            error: null,
            getAccessToken: vi.fn(),
            logout: vi.fn(),
        });
    });
    it('renders the sign-in button', () => {
        render(_jsx(LoginPage, {}));
        expect(screen.getByRole('button', { name: /Sign in with Microsoft/i })).toBeInTheDocument();
    });
    it('calls login function on button click', () => {
        render(_jsx(LoginPage, {}));
        const signInButton = screen.getByRole('button', { name: /Sign in with Microsoft/i });
        fireEvent.click(signInButton);
        expect(mockLogin).toHaveBeenCalledTimes(1);
    });
});
