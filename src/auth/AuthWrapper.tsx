import React from 'react';
import { MsalProvider } from '@azure/msal-react';
import { msalInstance } from './msalInstance';
import { AuthProvider } from './AuthProvider';

export interface AuthWrapperProps {
  children: React.ReactNode;
}

const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => (
  <MsalProvider instance={msalInstance}>
    <AuthProvider>{children}</AuthProvider>
  </MsalProvider>
);

export { AuthWrapper };
