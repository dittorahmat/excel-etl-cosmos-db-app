import { createContext } from 'react';
import { AccountInfo } from '@azure/msal-browser';

export interface AuthContextType {
  isAuthenticated: boolean;
  user: AccountInfo | null;
  loading: boolean;
  error: Error | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Export the provider's props type
export interface AuthProviderProps {
  children: React.ReactNode;
}
