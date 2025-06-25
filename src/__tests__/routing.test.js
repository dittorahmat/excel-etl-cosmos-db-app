import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
    MsalProvider: ({ children }) => _jsx(_Fragment, { children: children }),
}));
// Mock components
const Home = () => _jsx("div", { "data-testid": "home", children: "Home Page" });
const Dashboard = () => _jsx("div", { "data-testid": "dashboard", children: "Dashboard Page" });
const Profile = () => _jsx("div", { "data-testid": "profile", children: "Profile Page" });
// Mock layout component with navigation
const AppLayout = () => {
    return (_jsxs("div", { children: [_jsxs("nav", { children: [_jsx("a", { href: "/", "data-testid": "home-link", children: "Home" }), _jsx("a", { href: "/dashboard", "data-testid": "dashboard-link", children: "Dashboard" }), _jsx("a", { href: "/profile", "data-testid": "profile-link", children: "Profile" })] }), _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(Home, {}) }), _jsx(Route, { path: "/dashboard", element: _jsx(Dashboard, {}) }), _jsx(Route, { path: "/profile", element: _jsx(Profile, {}) })] })] }));
};
// Test component with router
const AppWithRouter = () => (_jsx(MemoryRouter, { initialEntries: ['/'], children: _jsx(AppLayout, {}) }));
describe('App Routing', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        document.body.innerHTML = '';
    });
    it('renders home page by default', async () => {
        render(_jsx(AppWithRouter, {}));
        // Check if home page is rendered by default
        expect(screen.getByTestId('home')).toBeInTheDocument();
    });
    it('navigates to dashboard page', async () => {
        render(_jsx(MemoryRouter, { initialEntries: ['/'], children: _jsx(AppLayout, {}) }));
        // Click dashboard link
        const dashboardLink = screen.getByTestId('dashboard-link');
        dashboardLink.click();
        // Check if dashboard page is rendered
        await waitFor(() => {
            expect(screen.getByTestId('dashboard')).toBeInTheDocument();
        });
    });
    it('navigates to profile page', async () => {
        render(_jsx(MemoryRouter, { initialEntries: ['/'], children: _jsx(AppLayout, {}) }));
        // Click profile link
        const profileLink = screen.getByTestId('profile-link');
        profileLink.click();
        // Check if profile page is rendered
        await waitFor(() => {
            expect(screen.getByTestId('profile')).toBeInTheDocument();
        });
    });
});
