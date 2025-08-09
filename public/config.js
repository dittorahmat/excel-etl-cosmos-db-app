// Frontend configuration - this file is automatically included in the public directory
// and will be available at the root URL as config.js

// This file is a fallback for when environment variables are not available at build time
// It will be overridden by environment variables at runtime if they are set

// Azure AD configuration
window.appConfig = {
  azure: {
    clientId: window.ENV?.VITE_AZURE_CLIENT_ID || 'YOUR_CLIENT_ID',
    tenantId: window.ENV?.VITE_AZURE_TENANT_ID || 'YOUR_TENANT_ID',
    redirectUri: window.ENV?.VITE_AZURE_REDIRECT_URI || window.location.origin,
    apiScope: window.ENV?.VITE_API_SCOPE || 'api://YOUR_API_CLIENT_ID/access_as_user',
    apiBaseUrl: window.ENV?.VITE_API_BASE_URL || '/api'
  }
};

// Log the config in development
if (process.env.NODE_ENV === 'development') {
  console.log('App config loaded:', window.appConfig);
}
