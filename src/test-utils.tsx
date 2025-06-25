import { render as rtlRender, RenderOptions, act } from '@testing-library/react';
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

type WrapperProps = {
  children: React.ReactNode;
  initialEntries?: string[];
};

// Wrapper component that includes all necessary providers
const AllTheProviders = ({
  children,
  initialEntries = ['/']
}: WrapperProps) => {
  return (
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={theme}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <AuthProvider>
            <MemoryRouter initialEntries={initialEntries}>
              <Routes>
                <Route path="*" element={children} />
              </Routes>
            </MemoryRouter>
          </AuthProvider>
        </LocalizationProvider>
      </ThemeProvider>
    </StyledEngineProvider>
  );
};

// Custom render function that wraps components with all necessary providers
const customRender = (
  ui: React.ReactElement,
  options?: RenderOptions & { initialEntries?: string[] }
) => {
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



  const DefaultWrapper = ({ children }: { children: React.ReactNode }) => (
    <MsalProvider instance={mockMsalInstance}>
      <AllTheProviders initialEntries={initialEntries}>
        {children}
      </AllTheProviders>
    </MsalProvider>
  );

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
  } catch (error) {
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
