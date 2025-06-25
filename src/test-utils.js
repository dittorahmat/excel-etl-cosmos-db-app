import { jsx as _jsx } from "react/jsx-runtime";
import { render as rtlRender, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme, StyledEngineProvider } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { vi } from 'vitest';
import { AuthProvider } from './auth/AuthProvider';
import { PublicClientApplication } from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';
// Suppress act() warnings globally
const originalError = console.error;
beforeAll(() => {
    vi.spyOn(console, 'error').mockImplementation((...args) => {
        if (typeof args[0] === 'string' &&
            /Warning: An update to .* inside a test was not wrapped in act/.test(args[0])) {
            return;
        }
        originalError.call(console, ...args);
    });
});
afterAll(() => {
    vi.restoreAllMocks();
});
const theme = createTheme();
// Wrapper component that includes all necessary providers
const AllTheProviders = ({ children, initialEntries = ['/'] }) => {
    return (_jsx(StyledEngineProvider, { injectFirst: true, children: _jsx(ThemeProvider, { theme: theme, children: _jsx(LocalizationProvider, { dateAdapter: AdapterDateFns, children: _jsx(AuthProvider, { children: _jsx(MemoryRouter, { initialEntries: initialEntries, children: _jsx(Routes, { children: _jsx(Route, { path: "*", element: children }) }) }) }) }) }) }));
};
// Custom render function that wraps components with all necessary providers
const customRender = (ui, options) => {
    const { initialEntries = ['/'], wrapper: WrapperComponent, ...renderOptions } = options || {};
    const mockMsalInstance = new PublicClientApplication({
        auth: {
            clientId: 'test-client-id',
            authority: 'https://login.microsoftonline.com/test-tenant-id',
            redirectUri: 'http://localhost:3000',
        },
        cache: {
            cacheLocation: 'sessionStorage',
            storeAuthStateInCookie: false,
        },
    });
    const DefaultWrapper = ({ children }) => (_jsx(MsalProvider, { instance: mockMsalInstance, children: _jsx(AllTheProviders, { initialEntries: initialEntries, children: children }) }));
    // Use the provided WrapperComponent if available, otherwise use the default Wrapper
    const FinalWrapper = WrapperComponent || DefaultWrapper;
    return {
        user: userEvent.setup(),
        ...rtlRender(ui, { wrapper: FinalWrapper, ...renderOptions }),
    };
};
// Custom cleanup function
const customCleanup = async () => {
    // Clean up any rendered components
    // Clean up any rendered components
    // No need to render a new component just for cleanup, RTL's cleanup is sufficient
};
// Cleanup function to ensure proper cleanup between tests
const customTestCleanup = async () => {
    try {
        // First clean up any test-utils specific cleanup
        await customCleanup();
        // Clear all mocks and reset state
        vi.clearAllMocks();
        vi.resetAllMocks();
        vi.resetModules();
        // Clear storage
        localStorage.clear();
        sessionStorage.clear();
        // Reset any timers
        vi.useRealTimers();
        // Wait for any pending promises to resolve
        await new Promise(resolve => setTimeout(resolve, 0));
        // Wait for any pending React updates to complete with act
        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
        });
    }
    catch (error) {
        console.error('Error during test cleanup:', error);
    }
};
// Helper function to wait for the next render cycle
export const waitForRender = async (ms = 0) => {
    await act(async () => {
        await new Promise(resolve => setTimeout(resolve, ms));
    });
};
// Export userEvent from @testing-library/user-event for convenience
export { userEvent };
// Re-export everything from @testing-library/react
export * from '@testing-library/react';
// Export our custom render method and cleanup
export { customRender as render, customTestCleanup as cleanup };
