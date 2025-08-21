// This file is auto-generated during build
window.__APP_CONFIG__ = {
  "VITE_AZURE_CLIENT_ID": "1a6232b5-e392-4b8d-9a30-23fb8642d9c0",
  "VITE_AZURE_TENANT_ID": "004263f2-caf5-4ca1-8024-41ebc448d7c4",
  "VITE_AZURE_REDIRECT_URI": "http://localhost:4137",
  "VITE_AZURE_SCOPES": "User.Read openid profile email",
  "VITE_API_SCOPE": "api://1a6232b5-e392-4b8d-9a30-23fb8642d9c0/access_as_user",
  "MODE": "development",
  "PROD": false,
  "DEV": true
};

// Also set values in window.ENV for backward compatibility
if (!window.ENV) {
  window.ENV = {};
}
Object.assign(window.ENV, {
  VITE_AUTH_ENABLED: 'true',
  AUTH_ENABLED: 'true',
  VITE_AZURE_CLIENT_ID: '1a6232b5-e392-4b8d-9a30-23fb8642d9c0',
  VITE_AZURE_TENANT_ID: '004263f2-caf5-4ca1-8024-41ebc448d7c4',
  VITE_AZURE_REDIRECT_URI: 'http://localhost:4137',
  NODE_ENV: 'development',
  MODE: 'development'
});

// Set dummy auth flags based on auth enabled status
window.USE_DUMMY_AUTH = false;
window.FORCE_DUMMY_AUTH = false;