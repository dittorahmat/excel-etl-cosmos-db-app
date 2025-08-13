// Frontend configuration - this file is automatically included in the public directory
// and will be available at the root URL as config.js

// This script runs before anything else in the application
(function() {
  console.log('config.js: Starting configuration');
  
  // Check if authentication is disabled
  const isDevelopment = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' ||
                       window.location.hostname.includes('localhost');
  
  // Check if we should force dummy auth
  const forceDummyAuth = window.FORCE_DUMMY_AUTH === true;
  
  // Check both VITE_AUTH_ENABLED and AUTH_ENABLED environment variables
  // Default to false if not set (insecure by default for this app)
  const viteAuthEnabled = window.ENV?.VITE_AUTH_ENABLED === 'true';
  const authEnabled = window.ENV?.AUTH_ENABLED === 'true' && viteAuthEnabled;
  
  // Always use dummy auth if forced, or if auth is disabled, or if in development
  const useDummyAuth = forceDummyAuth || !authEnabled || isDevelopment;
  
  console.log('config.js: Auth configuration', {
    forceDummyAuth,
    viteAuthEnabled,
    authEnabled,
    isDevelopment,
    useDummyAuth,
    windowENV: window.ENV
  });

  // Set global flags before any other scripts run
  window.USE_DUMMY_AUTH = useDummyAuth;
  
  // Create the application config object
  const appConfig = {
    // Authentication settings
    auth: {
      enabled: authEnabled,
      useDummyAuth: useDummyAuth,
      dummyUser: {
        name: isDevelopment ? 'Development User' : 'User',
        username: isDevelopment ? 'dev@example.com' : 'user@example.com',
        roles: ['user', ...(isDevelopment ? ['admin'] : [])]
      }
    },
    
    // Azure AD configuration (only used if auth is enabled)
    azure: useDummyAuth ? null : {
      clientId: window.ENV?.VITE_AZURE_CLIENT_ID || 'YOUR_CLIENT_ID',
      tenantId: window.ENV?.VITE_AZURE_TENANT_ID || 'YOUR_TENANT_ID',
      redirectUri: window.ENV?.VITE_AZURE_REDIRECT_URI || window.location.origin,
      apiScope: window.ENV?.VITE_API_SCOPE || 'api://YOUR_API_CLIENT_ID/access_as_user',
      apiBaseUrl: window.ENV?.VITE_API_BASE_URL || '/api'
    }
  };

  // Make the config available globally
  window.APP_CONFIG = appConfig;
  window.appConfig = appConfig;

  // Log the config for debugging
  console.log('Application Configuration:', {
    env: {
      VITE_AUTH_ENABLED: window.ENV?.VITE_AUTH_ENABLED,
      AUTH_ENABLED: window.ENV?.AUTH_ENABLED,
      NODE_ENV: window.ENV?.NODE_ENV,
      MODE: window.ENV?.MODE
    },
    config: appConfig,
    isDevelopment,
    useDummyAuth
  });

  // If using dummy auth, set a flag in localStorage
  if (useDummyAuth) {
    localStorage.setItem('useDummyAuth', 'true');
    console.log('Dummy authentication is enabled');
  }
  
  // Log the config in development
  if (isDevelopment) {
    console.log('App config loaded:', appConfig);
    console.log('Authentication mode:', useDummyAuth ? 'MOCK (development or disabled)' : 'AZURE AD');
  }
})();
