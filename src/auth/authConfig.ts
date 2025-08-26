// Vite environment variables are exposed with import.meta.env.VITE_*
const env = import.meta.env;

// Fallback to window config if available (for production deployments)
const windowEnv = typeof window !== 'undefined' && (window as any).__APP_CONFIG__ ? (window as any).__APP_CONFIG__ : {};

// Helper to safely get origin in both browser and test environments
const getOrigin = (): string => {
  if (typeof window !== 'undefined' && window.location) {
    return window.location.origin;
  }
  // Try public variables first, then fall back to non-public ones
  return env.VITE_PUBLIC_AZURE_REDIRECT_URI || env.VITE_AZURE_REDIRECT_URI || 'http://localhost:3000';
};

import { LogLevel } from '@azure/msal-browser';

// Helper to get environment variables with fallback to public variables and window config
const getEnv = (key: string, fallback = ''): string => {
  return env[key] || env[`VITE_PUBLIC_${key}`] || windowEnv[key] || windowEnv[`VITE_PUBLIC_${key}`] || fallback;
};

// Debug: Log all environment variables
console.log('Environment variables:', {
  VITE_AUTH_ENABLED: import.meta.env.VITE_AUTH_ENABLED,
  VITE_AZURE_CLIENT_ID: import.meta.env.VITE_AZURE_CLIENT_ID,
  NODE_ENV: import.meta.env.NODE_ENV,
  MODE: import.meta.env.MODE,
  DEV: import.meta.env.DEV,
  PROD: import.meta.env.PROD
});

// Check if authentication is enabled
// Auth is enabled if any of these are explicitly set to 'true'
const isAuthEnabled = 
  import.meta.env.VITE_AUTH_ENABLED === 'true' || 
  windowEnv.VITE_AUTH_ENABLED === 'true' || 
  windowEnv.AUTH_ENABLED === 'true' ||
  (typeof window !== 'undefined' && window.ENV?.VITE_AUTH_ENABLED === 'true') ||
  (typeof window !== 'undefined' && window.ENV?.AUTH_ENABLED === 'true');

// Check if auth is explicitly disabled
const isAuthDisabled = 
  import.meta.env.VITE_AUTH_ENABLED === 'false' || 
  windowEnv.VITE_AUTH_ENABLED === 'false' || 
  windowEnv.AUTH_ENABLED === 'false' ||
  (typeof window !== 'undefined' && window.ENV?.VITE_AUTH_ENABLED === 'false') ||
  (typeof window !== 'undefined' && window.ENV?.AUTH_ENABLED === 'false');

const isDevelopment = import.meta.env.DEV || 
                     (typeof window !== 'undefined' && window.location.hostname === 'localhost');

// Use dummy auth only if:
// 1. Auth is explicitly disabled, OR
// 2. We're in development and auth is not explicitly enabled, OR
// 3. Dummy auth is explicitly forced
const useDummyAuth = 
  isAuthDisabled || 
  (!isAuthEnabled && isDevelopment) ||
  (typeof window !== 'undefined' && (window.FORCE_DUMMY_AUTH === true || window.USE_DUMMY_AUTH === true));

// Force dummy auth if explicitly set in window
const forceDummyAuth = typeof window !== 'undefined' && (window.FORCE_DUMMY_AUTH === true || window.USE_DUMMY_AUTH === true);

// Debug: Log authentication configuration
console.log('Auth Configuration:', {
  'import.meta.env.VITE_AUTH_ENABLED': import.meta.env.VITE_AUTH_ENABLED,
  'import.meta.env.DEV': import.meta.env.DEV,
  'window.location.hostname': window.location.hostname,
  'isAuthEnabled': isAuthEnabled,
  'isDevelopment': isDevelopment,
  'useDummyAuth': useDummyAuth
});

// If auth is disabled, don't validate Azure AD settings
if (!isAuthEnabled) {
  console.log('Authentication is disabled. Using dummy authentication.');
}

// Configuration values
const clientId = useDummyAuth || forceDummyAuth
  ? '00000000-0000-0000-0000-000000000000' 
  : getEnv('VITE_AZURE_CLIENT_ID') || getEnv('VITE_PUBLIC_AZURE_CLIENT_ID');

const tenantId = useDummyAuth || forceDummyAuth
  ? '00000000-0000-0000-0000-000000000000' 
  : getEnv('VITE_AZURE_TENANT_ID') || getEnv('VITE_PUBLIC_AZURE_TENANT_ID');

const redirectUri = useDummyAuth || forceDummyAuth
  ? 'http://localhost:3000' 
  : getEnv('VITE_AZURE_REDIRECT_URI') || getEnv('VITE_PUBLIC_AZURE_REDIRECT_URI') || getOrigin();

const apiScope = useDummyAuth || forceDummyAuth
  ? 'api://00000000-0000-0000-0000-000000000000/access_as_user' 
  : getEnv('VITE_API_SCOPE') || getEnv('VITE_PUBLIC_API_SCOPE') || `api://${clientId}/access_as_user`;

console.log('Auth configuration:', {
  isAuthEnabled,
  isDevelopment,
  useDummyAuth,
  clientId,
  tenantId
});

// Only validate in development and if auth is enabled
if (isAuthEnabled && !forceDummyAuth) {
  if (isDevelopment && !clientId) {
    throw new Error('Azure AD Client ID is missing. Please set VITE_AZURE_CLIENT_ID or VITE_PUBLIC_AZURE_CLIENT_ID in your environment variables.');
  }

  if (isDevelopment && (clientId.includes('your-') || clientId === 'YOUR_CLIENT_ID')) {
    throw new Error(`Invalid Azure AD Client ID: "${clientId}". Please replace with your actual Azure AD Application (Client) ID from the Azure Portal.`);
  }

  if (isDevelopment && !tenantId) {
    throw new Error('Azure AD Tenant ID is missing. Please set VITE_AZURE_TENANT_ID or VITE_PUBLIC_AZURE_TENANT_ID in your environment variables.');
  }

  if (isDevelopment && (tenantId.includes('your-') || tenantId === 'YOUR_TENANT_ID')) {
    throw new Error(`Invalid Azure AD Tenant ID: "${tenantId}". Please replace with your actual Azure AD Directory (Tenant) ID from the Azure Portal.`);
  }
} else {
  console.log('Skipping Azure AD validation as authentication is disabled or forced to dummy auth');
}

// Debug: Log the configuration being used (redacting sensitive info)
console.log('Azure AD Configuration:', {
  clientId: clientId ? `${clientId.substring(0, 4)}...${clientId.substring(clientId.length - 4)}` : 'MISSING',
  tenantId: tenantId || 'MISSING',
  redirectUri: redirectUri || 'MISSING',
  apiScope: apiScope ? '***' : 'MISSING',
  env: process.env.NODE_ENV
});

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

// API Configuration
export const getApiConfig = () => {
  // In production, the API is served from the same origin
  // In development, it's on a separate port
  const isDev = import.meta.env.DEV;
  const apiBase = isDev ? (getEnv('VITE_API_BASE_URL') || 'http://localhost:3001') : '';
  
  const config = {
    scopes: [apiScope],
    uri: apiBase,
  };
  // Log the API configuration for debugging in development and production
  if (typeof window !== 'undefined') {
    console.log('API Config (Runtime):', {
      scope: config.scopes[0],
      uri: config.uri
    });
  }
  return config;
};

// Log the API configuration for debugging in development only
// if (import.meta.env.DEV && !import.meta.env.VITEST) {
//   console.log('API Config:', {
//     scope: getApiConfig().scopes[0],
//     uri: getApiConfig().uri
//   });
// }
