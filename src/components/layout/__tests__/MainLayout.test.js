import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, act } from '@testing-library/react';
import { render } from '../../../test-utils';
import { MainLayout } from '../MainLayout';
// Mock useMediaQuery
vi.mock('@mui/material/useMediaQuery', () => ({
    __esModule: true,
    default: vi.fn().mockReturnValue(false),
}));
// Mock the Navbar and Sidebar components
vi.mock('../Navbar', () => ({
    Navbar: ({ onMenuClick }) => (_jsx("nav", { "data-testid": "navbar", onClick: onMenuClick, children: "Mock Navbar" })),
}));
vi.mock('../Sidebar', () => ({
    Sidebar: ({ mobileOpen, onClose }) => (_jsxs("aside", { "data-testid": "sidebar", "data-open": mobileOpen, children: ["Mock Sidebar", _jsx("button", { onClick: onClose, children: "Close" })] })),
}));
describe('MainLayout', () => {
    // Mock useMediaQuery for mobile view
    const mockUseMediaQuery = vi.hoisted(() => vi.fn());
    beforeEach(() => {
        vi.resetAllMocks();
        vi.mocked(mockUseMediaQuery).mockReturnValue(false);
    });
    it('renders without crashing', async () => {
        await act(async () => {
            render(_jsx(MainLayout, { children: _jsx("div", { children: "Test Content" }) }));
        });
        expect(screen.getByTestId('navbar')).toBeInTheDocument();
        expect(screen.getByTestId('sidebar')).toBeInTheDocument();
        expect(screen.getByText('Test Content')).toBeInTheDocument();
    });
    it('renders children content', async () => {
        const testContent = 'Main Content';
        await act(async () => {
            render(_jsx(MainLayout, { children: _jsx("div", { children: testContent }) }));
        });
        expect(screen.getByText(testContent)).toBeInTheDocument();
    });
    it('passes the onMenuClick handler to Navbar', async () => {
        // Mock mobile view
        vi.mocked(mockUseMediaQuery).mockReturnValue(true);
        await act(async () => {
            render(_jsx(MainLayout, { children: _jsx("div", { children: "Test" }) }));
        });
        // Check if the navbar has the onClick handler
        const navbar = screen.getByTestId('navbar');
        expect(navbar).toHaveAttribute('onclick');
    });
});
