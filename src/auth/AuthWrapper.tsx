import React from 'react';
import { MsalProvider } from '@azure/msal-react';
import { msalInstance } from './msalInstance';
import AuthProvider from './AuthProvider';

export interface AuthWrapperProps {
  children: React.ReactNode;
}

const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  const windowEnvViteAuthEnabled = window.ENV?.VITE_AUTH_ENABLED || (window as any).__APP_CONFIG__?.VITE_AUTH_ENABLED;
  const windowEnvAuthEnabled = window.ENV?.AUTH_ENABLED || (window as any).__APP_CONFIG__?.AUTH_ENABLED;
  
  // Check if auth is explicitly enabled in any of the possible sources
  const authExplicitlyEnabled = 
    import.meta.env.VITE_AUTH_ENABLED === 'true' || 
    import.meta.env.AUTH_ENABLED === 'true' ||
    windowEnvViteAuthEnabled === 'true' || 
    windowEnvAuthEnabled === 'true' ||
    windowEnvViteAuthEnabled === true || 
    windowEnvAuthEnabled === true;

  // Check if auth is explicitly disabled
  const authExplicitlyDisabled = 
    import.meta.env.VITE_AUTH_ENABLED === 'false' || 
    import.meta.env.AUTH_ENABLED === 'false' ||
    windowEnvViteAuthEnabled === 'false' || 
    windowEnvAuthEnabled === 'false' ||
    windowEnvViteAuthEnabled === false || 
    windowEnvAuthEnabled === false;
  
  const isDevelopment = import.meta.env.DEV;
  
  // Use dummy auth only if:
  // 1. Auth is explicitly disabled, OR
  // 2. We're in development and auth is not explicitly enabled
  const useDummyAuth = 
    authExplicitlyDisabled || 
    (!authExplicitlyEnabled && isDevelopment);

  console.log('AuthWrapper - Authentication status:', {
    authExplicitlyEnabled,
    authExplicitlyDisabled,
    isDevelopment,
    useDummyAuth,
    envVars: {
      VITE_AUTH_ENABLED: import.meta.env.VITE_AUTH_ENABLED,
      AUTH_ENABLED: import.meta.env.AUTH_ENABLED,
      windowEnvViteAuthEnabled,
      windowEnvAuthEnabled
    }
  });
  
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
