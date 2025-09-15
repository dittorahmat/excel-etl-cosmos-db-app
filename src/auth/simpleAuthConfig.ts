import { LogLevel } from '@azure/msal-browser';

// Simple authentication configuration
export interface SimpleAuthConfig {
  isAuthEnabled: boolean;
  isDevelopment: boolean;
  useDummyAuth: boolean;
  clientId: string;
  tenantId: string;
  redirectUri: string;
  apiScope: string;
}

// Get simplified authentication configuration
export const getSimpleAuthConfig = (): SimpleAuthConfig => {
  // Check if we're in development
  const isDevelopment = import.meta.env.DEV || 
                      window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1';

  // Check if authentication is explicitly enabled or disabled
  const authEnabled = import.meta.env.VITE_AUTH_ENABLED === 'true';
  const authDisabled = import.meta.env.VITE_AUTH_ENABLED === 'false';

  // Use dummy auth in development when auth is not explicitly enabled
  // or when auth is explicitly disabled
  const useDummyAuth = authDisabled || (!authEnabled && isDevelopment);

  // Configuration values
  const clientId = useDummyAuth
    ? '00000000-0000-0000-0000-000000000000'
    : (import.meta.env.VITE_AZURE_CLIENT_ID || '');

  const tenantId = useDummyAuth
    ? '00000000-0000-0000-0000-000000000000'
    : (import.meta.env.VITE_AZURE_TENANT_ID || '');

  const redirectUri = useDummyAuth
    ? 'http://localhost:3000'
    : (import.meta.env.VITE_AZURE_REDIRECT_URI || 'http://localhost:3000');

  const apiScope = useDummyAuth
    ? 'api://00000000-0000-0000-0000-000000000000/access_as_user'
    : (import.meta.env.VITE_API_SCOPE || '');

  return {
    isAuthEnabled: authEnabled,
    isDevelopment,
    useDummyAuth,
    clientId,
    tenantId,
    redirectUri,
    apiScope
  };
};

// Get Azure AD configuration
export const getSimpleAzureAdConfig = () => {
  const authConfig = getSimpleAuthConfig();

  return {
    clientId: authConfig.clientId,
    tenantId: authConfig.tenantId,
    redirectUri: authConfig.redirectUri,
    scopes: ['User.Read', 'openid', 'profile', 'email'],
    authority: `https://login.microsoftonline.com/${authConfig.tenantId}`,
    apiScope: authConfig.apiScope
  };
};

// Get MSAL configuration
export const getSimpleMsalConfig = () => {
  const azureAdConfig = getSimpleAzureAdConfig();

  return {
    auth: {
      clientId: azureAdConfig.clientId,
      authority: azureAdConfig.authority,
      redirectUri: azureAdConfig.redirectUri,
      postLogoutRedirectUri: azureAdConfig.redirectUri,
      navigateToLoginRequestUrl: false,
    },
    cache: {
      cacheLocation: 'sessionStorage',
      storeAuthStateInCookie: false,
    },
    system: {
      loggerOptions: {
        loggerCallback: (level: number, message: string, containsPii: boolean): void => {
          if (containsPii) return;
          switch (level) {
            case 3: // Error
              console.error(message);
              break;
            case 2: // Warning
              console.warn(message);
              break;
            case 1: // Info
              console.info(message);
              break;
            default:
              console.log(message);
          }
        },
        logLevel: import.meta.env.DEV ? LogLevel.Info : LogLevel.Error,
      },
    },
  };
};

// Get login request configuration
export const getSimpleLoginRequest = () => {
  const azureAdConfig = getSimpleAzureAdConfig();
  return {
    scopes: azureAdConfig.scopes,
    prompt: 'select_account',
  };
};

// Get API configuration
export const getSimpleApiConfig = () => {
  const authConfig = getSimpleAuthConfig();
  const isDev = import.meta.env.DEV;
  const apiBase = isDev ? 'http://localhost:3001' : '';

  return {
    scopes: [authConfig.apiScope],
    uri: apiBase,
  };
};