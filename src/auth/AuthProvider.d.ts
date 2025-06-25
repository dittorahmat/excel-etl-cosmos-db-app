import React from 'react';
import type { AccountInfo } from '@azure/msal-browser';
import { PublicClientApplication } from '@azure/msal-browser';
import type { ReactNode } from 'react';
export declare const msalInstance: PublicClientApplication;
export interface AuthContextType {
    isAuthenticated: boolean;
    user: AccountInfo | null;
    login: () => Promise<void>;
    logout: () => Promise<void>;
    getAccessToken: () => Promise<string | null>;
    error: Error | null;
    loading: boolean;
}
export interface AuthProviderProps {
    children: ReactNode;
}
export interface AuthWrapperProps {
    children: ReactNode;
}
declare const AuthProvider: React.FC<AuthProviderProps>;
/**
 * Hook to use the auth context
 * @returns AuthContextType with authentication state and methods
 */
declare const useAuth: () => AuthContextType;
/**
 * Wrapper component that provides MSAL and Auth contexts
 */
declare const AuthWrapper: React.FC<AuthWrapperProps>;
export { AuthProvider, useAuth, AuthWrapper };
