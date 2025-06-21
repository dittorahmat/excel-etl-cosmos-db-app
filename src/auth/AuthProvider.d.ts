import type { AccountInfo } from '@azure/msal-browser';
import { PublicClientApplication } from '@azure/msal-browser';
import type { ReactNode } from 'react';
export declare const msalInstance: PublicClientApplication;
interface AuthContextType {
    isAuthenticated: boolean;
    user: AccountInfo | null;
    login: () => Promise<void>;
    logout: () => Promise<void>;
    getAccessToken: () => Promise<string | null>;
    error: Error | null;
    loading: boolean;
}
interface AuthProviderProps {
    children: ReactNode;
}
export declare const AuthProvider: React.FC<AuthProviderProps>;
/**
 * Hook to use the auth context
 * @returns AuthContextType with authentication state and methods
 */
export declare const useAuth: () => AuthContextType;
interface AuthWrapperProps {
    children: ReactNode;
}
/**
 * Wrapper component that provides MSAL and Auth contexts
 */
export declare const AuthWrapper: React.FC<AuthWrapperProps>;
export type { AuthContextType };
