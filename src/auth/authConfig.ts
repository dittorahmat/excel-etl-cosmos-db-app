// Vite environment variables are exposed with import.meta.env.VITE_*
const env = import.meta.env;

// Helper to safely get origin in both browser and test environments
const getOrigin = (): string => {
  if (typeof window !== 'undefined' && window.location) {
    return window.location.origin;
  }
  // Try public variables first, then fall back to non-public ones
  return env.VITE_PUBLIC_AZURE_REDIRECT_URI || env.VITE_AZURE_REDIRECT_URI || 'http://localhost:3000';
};

import { LogLevel } from '@azure/msal-browser';

// Helper to get environment variables with fallback to public variables
const getEnv = (key: string, fallback = ''): string => {
  return env[key] || env[`VITE_PUBLIC_${key}`] || fallback;
};

// Get configuration values with public variable fallback
const clientId = getEnv('VITE_AZURE_CLIENT_ID');
const tenantId = getEnv('VITE_AZURE_TENANT_ID');
const redirectUri = getEnv('VITE_AZURE_REDIRECT_URI') || getOrigin();
const apiScope = getEnv('VITE_API_SCOPE') || `api://${clientId}/access_as_user`;

// Validate required configuration values
if (!clientId || clientId.includes('your-') || clientId === 'YOUR_CLIENT_ID') {
  throw new Error('Invalid Azure AD Client ID. Please check your environment variables.');
}

if (!tenantId || tenantId.includes('your-') || tenantId === 'YOUR_TENANT_ID') {
  throw new Error('Invalid Azure AD Tenant ID. Please check your environment variables.');
}

// Azure AD Configuration
export const azureAdConfig = {
  clientId,
  tenantId,
  redirectUri,
  scopes: (getEnv('VITE_AZURE_SCOPES', 'User.Read openid profile email')).split(' '),
  authority: `https://login.microsoftonline.com/${tenantId}`,
  knownAuthorities: [
    'login.microsoftonline.com',
    `https://login.microsoftonline.com/${tenantId}`
  ],
  // Add API scope for backend access
  apiScope
} as const;

// Log the actual configuration being used (safely)
if (typeof window !== 'undefined') {
  console.log('Azure AD Configuration:', {
    clientId: '***' + azureAdConfig.clientId.slice(-4),
    tenantId: azureAdConfig.tenantId,
    redirectUri: azureAdConfig.redirectUri,
    authority: azureAdConfig.authority,
    scopes: azureAdConfig.scopes,
    knownAuthorities: azureAdConfig.knownAuthorities,
    location: window.location.href
  });
}

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
};

// Type for the runtime configuration
interface RuntimeConfig {
  VITE_API_BASE_URL?: string;
  [key: string]: unknown;
}

declare global {
  interface Window {
    __APP_CONFIG__?: RuntimeConfig;
  }
}

// Get runtime config, falling back to build-time env vars
const getRuntimeConfig = (): RuntimeConfig => (window.__APP_CONFIG__ || import.meta.env) as RuntimeConfig;

// API Configuration
export const getApiConfig = () => {
  const runtimeConfig = getRuntimeConfig();
  return {
    scopes: [`api://exceletlfunc-wqp03jun.azurewebsites.net/access_as_user`],
    uri: runtimeConfig.VITE_API_BASE_URL || '/api',
  };
};

// Log the API configuration for debugging in development only
// if (import.meta.env.DEV && !import.meta.env.VITEST) {
//   console.log('API Config:', {
//     scope: getApiConfig().scopes[0],
//     uri: getApiConfig().uri
//   });
// }
