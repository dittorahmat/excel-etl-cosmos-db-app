import { jsx as _jsx } from "react/jsx-runtime";
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, act } from '@testing-library/react';
import { render } from '../../../test-utils';
import { Sidebar } from '../Sidebar';
// Mock the useAuth hook
const mockUseAuth = vi.fn().mockReturnValue({
    isAuthenticated: true,
    user: null,
    login: vi.fn(),
    logout: vi.fn(),
    getAccessToken: vi.fn().mockResolvedValue('test-token'),
});
vi.mock('../../../auth/AuthProvider', () => ({
    useAuth: () => mockUseAuth(),
}));
describe('Sidebar', () => {
    const mockOnClose = vi.fn();
    beforeEach(() => {
        vi.clearAllMocks();
    });
    it('renders without crashing', async () => {
        render(_jsx(Sidebar, { mobileOpen: false, onClose: mockOnClose }));
        await act(async () => {
            expect(await screen.findByRole('navigation')).toBeInTheDocument();
        });
    });
    it('renders menu items', async () => {
        render(_jsx(Sidebar, { mobileOpen: false, onClose: mockOnClose }));
        await act(async () => {
            // Check for main menu items
            expect(await screen.findByText('Dashboard')).toBeInTheDocument();
            expect(await screen.findByText('Data Upload')).toBeInTheDocument();
            expect(await screen.findByText('Data Management')).toBeInTheDocument();
            expect(await screen.findByText('Bulk Operations')).toBeInTheDocument();
            expect(await screen.findByText('Settings')).toBeInTheDocument();
        });
    });
    it('renders child menu items when parent is clicked', async () => {
        render(_jsx(Sidebar, { mobileOpen: false, onClose: mockOnClose }));
        // Click on Data Management to expand
        await act(async () => {
            fireEvent.click(await screen.findByText('Data Management'));
        });
        // Check if child items are visible
        expect(await screen.findByText('View All Data')).toBeInTheDocument();
        expect(await screen.findByText('Add New')).toBeInTheDocument();
    });
    it('calls onClose when clicking the close button', async () => {
        render(_jsx(Sidebar, { mobileOpen: true, onClose: mockOnClose }));
        // Click the close button (simulated)
        await act(async () => {
            fireEvent.click(await screen.findByRole('button', { name: /close/i }));
        });
        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
    it('hides admin menu items when not authenticated', async () => {
        // Override the mock to return unauthenticated
        mockUseAuth.mockReturnValue({
            isAuthenticated: false,
            user: null,
            login: vi.fn(),
            logout: vi.fn(),
            getAccessToken: vi.fn().mockResolvedValue('test-token'),
        });
        render(_jsx(Sidebar, { mobileOpen: false, onClose: mockOnClose }));
        await act(async () => {
            // Settings should be hidden when not authenticated
            expect(screen.queryByText('Settings')).not.toBeInTheDocument();
        });
    });
});
