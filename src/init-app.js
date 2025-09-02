console.log('Initializing application...');

// Set a flag to indicate we want to control MSAL initialization
// Changed to false to allow MSAL initialization to proceed
window.SKIP_MSAL_INIT = false;
console.log('SKIP_MSAL_INIT set to:', window.SKIP_MSAL_INIT);

// Ensure global is defined for Node.js like environments
window.global = window.global || window;

// Ensure process is defined for libraries that expect it
window.process = window.process || { env: {} };

// Initialize environment variables if not already set
window.ENV = window.ENV || {
  // Default all environment variables to ensure they're available
  VITE_AUTH_ENABLED: 'false',  // Default to 'false' - will be overridden by config.js
  AUTH_ENABLED: 'false',       // Default to 'false' - will be overridden by config.js
  NODE_ENV: 'production',
  MODE: 'production',
  // Add other environment variables that might be needed
  VITE_AZURE_CLIENT_ID: '',
  VITE_AZURE_TENANT_ID: '',
  VITE_AZURE_REDIRECT_URI: window.location.origin,
  VITE_API_SCOPE: '',
  VITE_API_BASE_URL: ''
};

// Load config.js and then set authentication flags
// This ensures we use the correct values from config.js
function initializeAuth() {
  console.log('Config loaded, window.__APP_CONFIG__:', window.__APP_CONFIG__);
  
  // Use values from config.js if available, otherwise use defaults
  if (window.__APP_CONFIG__) {
    // Merge config.js values with existing ENV
    console.log('Merging config values into window.ENV');
    Object.assign(window.ENV, window.__APP_CONFIG__);
    console.log('window.ENV after merge:', window.ENV);
  }
  
  // Override with any existing ENV values (highest priority)
  if (window.ENV_OVERRIDE) {
    Object.assign(window.ENV, window.ENV_OVERRIDE);
  }
  
  // Set authentication flags based on environment
  const isDevelopment = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' ||
                       window.location.hostname.includes('localhost');
                       
  // Check if auth is explicitly enabled in environment
  const authExplicitlyEnabled = window.ENV.VITE_AUTH_ENABLED === 'true' || window.ENV.AUTH_ENABLED === 'true';
  
  // Set dummy auth flags based on the actual config values
  window.FORCE_DUMMY_AUTH = !authExplicitlyEnabled;
  window.USE_DUMMY_AUTH = !authExplicitlyEnabled;
  
  console.log('Environment variables initialized:', window.ENV);
  console.log('Authentication mode - Explicitly enabled:', authExplicitlyEnabled, 'Is development:', isDevelopment);
  console.log('Dummy auth flags - FORCE_DUMMY_AUTH:', window.FORCE_DUMMY_AUTH, 'USE_DUMMY_AUTH:', window.USE_DUMMY_AUTH);
}

// Error boundary for better error handling
window.onerror = function(message, source, lineno, colno, error) {
  console.error('Global error:', { message, source, lineno, colno, error });
  return false; // Let the default handler run too
};

// Load the runtime config first
const script = document.createElement('script');
script.src = '/config.js';
script.onload = function() {
  console.log('config.js loaded successfully');
  initializeAuth();
  // Dispatch a custom event to signal that initialization is complete
  window.dispatchEvent(new CustomEvent('appInitialized'));
};
script.onerror = function(error) {
  console.error('Failed to load config.js:', error);
};
document.head.appendChild(script);