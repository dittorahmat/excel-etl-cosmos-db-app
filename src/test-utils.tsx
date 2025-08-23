import { render as rtlRender } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UserEvent } from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { PublicClientApplication } from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';
import AuthProvider from './auth/AuthProvider';
import { customTestCleanup, waitForRender } from './test-utils-core';

// Type for the wrapper component props
// This type is used internally by the TestProviders component
type _WrapperProps = {
  children: React.ReactNode;
  initialEntries?: string[];
};

// Export components and hooks separately to avoid Fast Refresh warnings
const TestProviders = {
  AllTheProviders: ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  ),
  DefaultWrapper: ({ children, initialEntries = ['/'] }: { children: React.ReactNode; initialEntries?: string[] }) => {
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

    return (
      <MsalProvider instance={mockMsalInstance}>
        <MemoryRouter initialEntries={initialEntries}>
          <TestProviders.AllTheProviders>{children}</TestProviders.AllTheProviders>
        </MemoryRouter>
      </MsalProvider>
    );
  }
};



// Custom render function that wraps components with all necessary providers
const customRender = (
  ui: React.ReactElement,
  options: {
    initialEntries?: string[];
    wrapper?: React.ComponentType<{ children: React.ReactNode }>;
    userEventOptions?: Parameters<typeof userEvent.setup>[0];
  } = {}
) => {
  const { 
    // initialEntries is used in the TestProviders.DefaultWrapper component
    initialEntries: _initialEntries = ['/'], 
    wrapper: WrapperComponent, 
    userEventOptions = {},
    ...renderOptions 
  } = options;

  // Mock MSAL instance is created in the TestProviders.DefaultWrapper component

  const FinalWrapper = WrapperComponent || TestProviders.DefaultWrapper;
  const user: UserEvent = userEvent.setup(userEventOptions);
  
  return {
    user,
    ...rtlRender(ui, { wrapper: FinalWrapper, ...renderOptions }),
  };
};

// Export our custom render method and cleanup
export const render = customRender;
export const cleanup = customTestCleanup;

// Export test utilities
export { waitForRender };

// Export userEvent from @testing-library/user-event for convenience
export { userEvent };

// Export testing-library utilities directly to avoid Fast Refresh issues
import * as testingLibrary from '@testing-library/react';
export const {
  // Re-export specific testing-library exports to avoid Fast Refresh warnings
  screen,
  fireEvent,
  waitFor,
  within,
  // Add other exports as needed
} = testingLibrary;
