// Vite environment variables are exposed with import.meta.env.VITE_*
const env = import.meta.env;

// Helper to safely get origin in both browser and test environments
const getOrigin = (): string => {
  if (typeof window !== 'undefined' && window.location) {
    return window.location.origin;
  }
  return env.VITE_AZURE_REDIRECT_URI || 'http://localhost:3000';
};

import { LogLevel } from '@azure/msal-browser';

// Azure AD Configuration
export const azureAdConfig = {
  clientId: env.VITE_AZURE_CLIENT_ID || '',
  tenantId: env.VITE_AZURE_TENANT_ID || 'organizations',
  redirectUri: env.VITE_AZURE_REDIRECT_URI || getOrigin(),
  scopes: (env.VITE_AZURE_SCOPES || 'User.Read openid profile email').split(' '),
  // Use 'organizations' as authority to support both work/school accounts and personal Microsoft accounts
  authority: 'https://login.microsoftonline.com/organizations',
  // Known authorities for both the tenant and common endpoints
  knownAuthorities: [
    'login.microsoftonline.com',
    `https://login.microsoftonline.com/${env.VITE_AZURE_TENANT_ID || 'common'}`
  ]
} as const;

// Log the actual configuration being used
console.log('Azure AD Configuration:', {
  clientId: azureAdConfig.clientId ? '***' + azureAdConfig.clientId.slice(-4) : 'MISSING',
  tenantId: azureAdConfig.tenantId,
  redirectUri: azureAdConfig.redirectUri,
  authority: azureAdConfig.authority,
  scopes: azureAdConfig.scopes,
  knownAuthorities: azureAdConfig.knownAuthorities,
  env: {
    VITE_AZURE_CLIENT_ID: env.VITE_AZURE_CLIENT_ID ? '***' + String(env.VITE_AZURE_CLIENT_ID).slice(-4) : 'MISSING',
    VITE_AZURE_TENANT_ID: env.VITE_AZURE_TENANT_ID || 'MISSING',
    VITE_AZURE_REDIRECT_URI: env.VITE_AZURE_REDIRECT_URI || 'MISSING',
    VITE_AZURE_SCOPES: env.VITE_AZURE_SCOPES || 'DEFAULT_SCOPES'
  },
  location: window.location.href
});

// Validate required configuration
if (!azureAdConfig.clientId) {
  console.error('Missing required configuration: VITE_AZURE_CLIENT_ID');
}

// Only log in development environment
if (import.meta.env.DEV && !import.meta.env.VITEST) {
  console.log('Azure AD Config:', {
    clientId: azureAdConfig.clientId ? '***' : 'MISSING',
    tenantId: azureAdConfig.tenantId,
    redirectUri: azureAdConfig.redirectUri,
    authority: azureAdConfig.authority,
    scopes: azureAdConfig.scopes
  });
}

// MSAL Configuration
export const msalConfig = {
  auth: {
    clientId: azureAdConfig.clientId,
    authority: azureAdConfig.authority,
    knownAuthorities: azureAdConfig.knownAuthorities,
    redirectUri: azureAdConfig.redirectUri,
    postLogoutRedirectUri: azureAdConfig.redirectUri,
    navigateToLoginRequestUrl: false, // Changed to false for better SPA behavior
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

// Login request configuration
export const loginRequest = {
  scopes: azureAdConfig.scopes,
  // Use 'select_account' to always show account picker
  prompt: 'select_account',
  // Add domain hint to help with B2B authentication
  extraQueryParameters: {
    domain_hint: 'organizations',
    // Ensure client_id is included in the request
    client_id: azureAdConfig.clientId,
    // Add any additional parameters required by your Azure AD app
    response_mode: 'fragment',
    response_type: 'id_token token',
    scope: azureAdConfig.scopes.join(' '),
  },
  // Explicitly disable the default token cache
  tokenQueryParameters: {
    client_info: '1'
  }
};

// API Configuration
export const apiConfig = {
  scopes: [env.VITE_API_SCOPE || 'api://access_as_user'],
  uri: env.VITE_API_BASE_URL || '/api',
};

// Log the API configuration for debugging in development only
if (import.meta.env.DEV && !import.meta.env.VITEST) {
  console.log('API Config:', {
    scope: apiConfig.scopes[0],
    uri: apiConfig.uri
  });
}
