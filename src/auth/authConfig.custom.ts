import { Configuration } from '@azure/msal-browser';

// Get environment variables with fallbacks
const getEnv = (key: string, defaultValue: string = ''): string => {
  return import.meta.env[`VITE_${key}`] || defaultValue;
};

// Azure AD Configuration
export const msalConfig: Configuration = {
  auth: {
    clientId: getEnv('AZURE_CLIENT_ID'),
    authority: `https://login.microsoftonline.com/${getEnv('AZURE_TENANT_ID', 'common')}`,
    redirectUri: getEnv('AZURE_REDIRECT_URI', window.location.origin),
    postLogoutRedirectUri: getEnv('AZURE_REDIRECT_URI', window.location.origin),
    navigateToLoginRequestUrl: false,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        console.log(`MSAL ${level}:`, message);
      },
      logLevel: 'Info',
    },
  },
};

// Login request configuration
export const loginRequest = {
  scopes: ['openid', 'profile', 'email'],
  prompt: 'select_account',
};

// Log the configuration
console.log('MSAL Configuration:', {
  ...msalConfig.auth,
  clientId: msalConfig.auth.clientId ? '***' + msalConfig.auth.clientId.slice(-4) : 'MISSING',
  redirectUri: msalConfig.auth.redirectUri,
  authority: msalConfig.auth.authority,
  scopes: loginRequest.scopes,
  env: {
    VITE_AZURE_CLIENT_ID: getEnv('AZURE_CLIENT_ID') ? '***' + getEnv('AZURE_CLIENT_ID').slice(-4) : 'MISSING',
    VITE_AZURE_TENANT_ID: getEnv('AZURE_TENANT_ID', 'common'),
    VITE_AZURE_REDIRECT_URI: getEnv('AZURE_REDIRECT_URI', 'DEFAULT_REDIRECT'),
  },
});
