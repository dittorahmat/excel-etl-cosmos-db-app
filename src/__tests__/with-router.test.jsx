import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { render, screen, act } from '@testing-library/react';
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
    MsalProvider: ({ children }) => (_jsx("div", { children: children })),
}));
// Simple component that uses React Router
const HomePage = () => _jsx("div", { "data-testid": "home-page", children: "Home Page" });
const AboutPage = () => _jsx("div", { "data-testid": "about-page", children: "About Page" });
const AppWithRouter = () => (_jsx(MemoryRouter, { initialEntries: ['/'], children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(HomePage, {}) }), _jsx(Route, { path: "/about", element: _jsx(AboutPage, {}) })] }) }));
describe('App with Router', () => {
    it('renders home page by default', async () => {
        await act(async () => {
            render(_jsx(AppWithRouter, {}));
        });
        expect(await screen.findByTestId('home-page')).to.exist;
        expect(screen.getByTestId('home-page').textContent).to.include('Home Page');
    });
});
