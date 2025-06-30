// Replace these values with your Azure AD app registration details
let appConfig = {};

// Function to load configuration from config.js
async function loadConfig() {
  try {
    const response = await fetch('/config.js');
    if (response.ok) {
      const script = document.createElement('script');
      script.src = '/config.js';
      script.onload = () => {
        appConfig = window.appConfig;
        
      };
      script.onerror = (error) => {
        console.error('Failed to load runtime configuration:', error);
      };
      document.head.appendChild(script);
    } else {
      console.error('Failed to fetch config.js:', response.statusText);
    }
  } catch (error) {
    console.error('Error loading config.js:', error);
  }
}

// Load config when the module is imported
loadConfig();

export const msalConfig = {
  auth: {
    clientId: appConfig.AZURE_CLIENT_ID || 'YOUR_CLIENT_ID', // Register your app in Azure AD to get this
    authority: `https://login.microsoftonline.com/${appConfig.AZURE_TENANT_ID || 'YOUR_TENANT_ID'}`,
    redirectUri: appConfig.AZURE_REDIRECT_URI || window.location.origin,
    postLogoutRedirectUri: appConfig.AZURE_REDIRECT_URI || window.location.origin,
  },
  cache: {
    cacheLocation: 'localStorage', // This configures where your cache will be stored
    storeAuthStateInCookie: false, // Set to true if you are having issues on IE11 or Edge
  },
};

// Add scopes here for ID token to be used at Microsoft identity platform endpoints.
export const loginRequest = {
  scopes: ['User.Read']
};

// Add the endpoints here for Microsoft Graph API services you'd like to use.
export const graphConfig = {
  graphMeEndpoint: 'https://graph.microsoft.com/v1.0/me'
};
