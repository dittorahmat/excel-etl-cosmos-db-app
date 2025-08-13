import { createContext, ReactNode, useContext } from 'react';
import { AccountInfo, AuthenticationResult } from '@azure/msal-browser';

/**
 * Authentication context type definition
 */
export interface AuthContextType {
  isAuthenticated: boolean;
  user: AccountInfo | null;
  loading: boolean;
  error: Error | null;
  login: () => Promise<AuthenticationResult | void>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
  getTokenSilently?: () => Promise<string | null>; // For backward compatibility
}

/**
 * Default authentication context value
 */
const defaultAuthContext: AuthContextType = {
  isAuthenticated: false,
  user: null,
  loading: true,
  error: null,
  login: async () => {},
  logout: async () => {},
  getAccessToken: async () => null,
  getTokenSilently: async () => null,
};

/**
 * Authentication context
 */
export const AuthContext = createContext<AuthContextType>(defaultAuthContext);

/**
 * AuthProvider component props
 */
export interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Hook to use the auth context
 * @returns The auth context
 * @throws Error if used outside of an AuthProvider
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Re-export common types
export type { AccountInfo, AuthenticationResult } from '@azure/msal-browser';
