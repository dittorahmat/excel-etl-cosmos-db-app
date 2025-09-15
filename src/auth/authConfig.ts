// Re-export the simplified authentication configuration
export { getSimpleMsalConfig as getMsalConfig } from './simpleAuthConfig';
export { getSimpleLoginRequest as getLoginRequest } from './simpleAuthConfig';
export { getSimpleApiConfig as getApiConfig } from './simpleAuthConfig';
export { getSimpleAzureAdConfig as getAzureAdConfig } from './simpleAuthConfig';

// Export the login request for backward compatibility
export { getSimpleLoginRequest as loginRequest } from './simpleAuthConfig';
