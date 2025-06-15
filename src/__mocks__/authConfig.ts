// Mock auth config for testing
export const msalConfig = {
  auth: {
    clientId: 'test-client-id',
    authority: 'https://login.microsoftonline.com/test-tenant-id',
    redirectUri: 'http://localhost:3000',
    postLogoutRedirectUri: 'http://localhost:3000',
    navigateToLoginRequestUrl: true,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
};

export const loginRequest = {
  scopes: ['api://test-api-scope/.default'],
};

export const tokenRequest = {
  scopes: ['api://test-api-scope/.default'],
  forceRefresh: false,
};
