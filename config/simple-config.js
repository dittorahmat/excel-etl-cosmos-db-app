// Simple config file for Azure AD authentication
// This file works in both Node.js and browser environments

// Function to get environment variables that works in both Node.js and browser
const getEnvVar = (name, defaultValue = '') => {
  // In browser environment, use window.__APP_CONFIG__
  if (typeof window !== 'undefined' && window.__APP_CONFIG__) {
    return window.__APP_CONFIG__[name] || defaultValue;
  }
  
  // In Node.js environment, use process.env
  if (typeof process !== 'undefined' && process.env) {
    return process.env[name] || defaultValue;
  }
  
  // Fallback
  return defaultValue;
};

const config = {
  shared: {
    env: {
      isDevelopment: getEnvVar('NODE_ENV') === 'development',
      isProduction: getEnvVar('NODE_ENV') === 'production'
    },
    auth: {
      enabled: getEnvVar('AUTH_ENABLED') === 'true'
    },
    azure: {
      clientId: getEnvVar('AZURE_CLIENT_ID', 'your-client-id'),
      tenantId: getEnvVar('AZURE_TENANT_ID', 'your-tenant-id'),
      redirectUri: getEnvVar('AZURE_REDIRECT_URI', 'http://localhost:3000'),
      apiScope: getEnvVar('AZURE_API_SCOPE', 'api://your-api-scope'),
      scopes: ['User.Read'],
      authority: `https://login.microsoftonline.com/${getEnvVar('AZURE_TENANT_ID', 'your-tenant-id')}`
    },
    api: {
      baseUrl: getEnvVar('API_BASE_URL', 'http://localhost:3001')
    }
  },
  client: {
    api: {
      baseUrl: getEnvVar('CLIENT_API_BASE_URL', '')
    }
  },
  server: {}
};

export default config;
export { config };