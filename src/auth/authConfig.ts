// Get environment variables with fallbacks
const getEnv = (key: string, defaultValue: string = ''): string => {
  return import.meta.env[`VITE_${key}`] || defaultValue;
};

// Helper to safely get origin in both browser and test environments
const getOrigin = (): string => {
  if (typeof window !== 'undefined' && window.location) {
    return window.location.origin;
  }
  return getEnv('AZURE_AD_REDIRECT_URI', 'http://localhost:3000');
};

// Azure AD Configuration
const azureAdConfig = {
  clientId: getEnv('AZURE_AD_CLIENT_ID'),
  tenantId: getEnv('AZURE_AD_TENANT_ID', 'common'),
  redirectUri: getEnv('AZURE_AD_REDIRECT_URI', getOrigin()),
  scopes: getEnv('AZURE_AD_SCOPES', 'User.Read openid profile email').split(' '),
  authority: `https://login.microsoftonline.com/${getEnv('AZURE_AD_TENANT_ID', 'common')}`,
};

// MSAL Configuration
export const msalConfig = {
  auth: {
    clientId: azureAdConfig.clientId,
    authority: azureAdConfig.authority,
    redirectUri: azureAdConfig.redirectUri,
    postLogoutRedirectUri: azureAdConfig.redirectUri,
    navigateToLoginRequestUrl: true,
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
};

// API Configuration
export const apiConfig = {
  scopes: [getEnv('API_SCOPE', 'api://access_as_user')],
  uri: getEnv('API_BASE_URL', '/api'),
};
