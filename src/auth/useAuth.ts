import { useContext } from 'react';
import { AuthContextType } from './auth.types';
import { createContext } from 'react';

export const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Hook to use the auth context
 * @returns AuthContextType with authentication state and methods
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
