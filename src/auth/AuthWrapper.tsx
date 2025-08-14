import React from 'react';
import { MsalProvider } from '@azure/msal-react';
import { msalInstance } from './msalInstance';
import AuthProvider from './AuthProvider';

export interface AuthWrapperProps {
  children: React.ReactNode;
}

const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  const authEnabled = import.meta.env.VITE_AUTH_ENABLED !== 'false';
  const isDevelopment = import.meta.env.DEV;
  const useDummyAuth = !authEnabled || isDevelopment;

  console.log('AuthWrapper - useDummyAuth:', useDummyAuth);
  
  if (useDummyAuth) {
    // Skip MSAL provider completely when using dummy auth
    return <AuthProvider>{children}</AuthProvider>;
  }

  // Use MSAL provider only when authentication is enabled
  return (
    <MsalProvider instance={msalInstance}>
      <AuthProvider>{children}</AuthProvider>
    </MsalProvider>
  );
};

export { AuthWrapper };
