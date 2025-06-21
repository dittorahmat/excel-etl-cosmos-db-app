// Replace these values with your Azure AD app registration details
export const msalConfig = {
    auth: {
        clientId: process.env.VITE_AZURE_CLIENT_ID || 'YOUR_CLIENT_ID', // Register your app in Azure AD to get this
        authority: `https://login.microsoftonline.com/${process.env.VITE_AZURE_TENANT_ID || 'YOUR_TENANT_ID'}`,
        redirectUri: window.location.origin,
        postLogoutRedirectUri: window.location.origin,
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
