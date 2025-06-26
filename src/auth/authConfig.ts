// Vite environment variables are exposed with import.meta.env.VITE_*
const env = import.meta.env;

// Helper to safely get origin in both browser and test environments
const getOrigin = (): string => {
  if (typeof window !== 'undefined' && window.location) {
    return window.location.origin;
  }
  return env.VITE_AZURE_REDIRECT_URI || 'http://localhost:3000';
};

// Azure AD Configuration
const azureAdConfig = {
  clientId: env.VITE_AZURE_CLIENT_ID || '',
  tenantId: env.VITE_AZURE_TENANT_ID || 'common',
  redirectUri: env.VITE_AZURE_REDIRECT_URI || getOrigin(),
  scopes: (env.VITE_AZURE_SCOPES || 'User.Read openid profile email').split(' '),
  // Use the tenant-specific endpoint for better security
  authority: `https://login.microsoftonline.com/${env.VITE_AZURE_TENANT_ID || 'common'}`,
  // Explicitly set the knownAuthorities for the tenant
  knownAuthorities: [
    `https://login.microsoftonline.com/${env.VITE_AZURE_TENANT_ID || 'common'}`
  ]
};

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
      logLevel: import.meta.env.DEV ? 'Info' : 'Error',
    },
  },
};

// Login request configuration
export const loginRequest = {
  scopes: azureAdConfig.scopes,
  prompt: 'select_account',
  extraQueryParameters: {
    // Ensure client_id is included in the request
    client_id: azureAdConfig.clientId,
    // Add any additional parameters required by your Azure AD app
    response_type: 'code',
    response_mode: 'fragment',
    domain_hint: 'organizations', // or 'consumers' for personal accounts
    // Add nonce for security
    nonce: window.crypto.getRandomValues(new Uint32Array(1))[0].toString(16)
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
