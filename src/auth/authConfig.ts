// Helper to safely get origin in both browser and test environments
const getOrigin = () => {
  if (typeof window !== 'undefined' && window.location) {
    return window.location.origin;
  }
  return 'http://localhost:3000'; // Default for test environment
};

export const msalConfig = {
  auth: {
    clientId: process.env.VITE_AZURE_AD_CLIENT_ID || '1a6232b5-e392-4b8d-9a30-23fb8642d9c0',
    authority: `https://login.microsoftonline.com/${process.env.VITE_AZURE_AD_TENANT_ID || '004263f2-caf5-4ca1-8024-41ebc448d7c4'}`,
    redirectUri: process.env.VITE_AZURE_AD_REDIRECT_URI || getOrigin(),
    postLogoutRedirectUri: process.env.VITE_AZURE_AD_REDIRECT_URI || getOrigin(),
    navigateToLoginRequestUrl: true,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level: any, message: string, containsPii: boolean) => {
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
      logLevel: 'Info',
    },
  },
};

export const loginRequest = {
  scopes: ['User.Read', 'openid', 'profile', 'email'],
};

export const apiConfig = {
  scopes: ['api://exceletlfunc-wqp03jun.azurewebsites.net/access_as_user'],
  uri: 'https://exceletlfunc-wqp03jun.azurewebsites.net/api',
};
