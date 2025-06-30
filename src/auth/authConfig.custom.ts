import { Configuration, LogLevel, BrowserCacheLocation } from '@azure/msal-browser';
import type { Configuration as NodeConfiguration } from '@azure/msal-node';

// Runtime configuration loaded from public/config.js
const getRuntimeConfig = () => {
  if (typeof window !== 'undefined' && (window as any).__APP_CONFIG__) {
    return (window as any).__APP_CONFIG__;
  }
  return {};
};

// Environment variable helper with type safety
const getEnv = (key: string, defaultValue: string = ''): string => {
  // First try getting from runtime config
  const runtimeConfig = getRuntimeConfig();
  if (runtimeConfig[key] !== undefined) return runtimeConfig[key];
  
  // Then try getting from import.meta.env (Vite)
  const viteValue = import.meta.env[`VITE_${key}`];
  if (viteValue !== undefined) return viteValue;
  
  // Then try getting from process.env (Node)
  const processValue = import.meta.env[`${key}`];
  if (processValue !== undefined) return processValue;
  
  console.warn(`Environment variable ${key} is not set. Using default value.`);
  return defaultValue;
};

// Validate required environment variables
const requiredEnvVars = ['AZURE_CLIENT_ID', 'AZURE_TENANT_ID'] as const;
const missingVars = requiredEnvVars.filter(varName => !getEnv(varName));

if (missingVars.length > 0) {
  console.error('Missing required environment variables:', missingVars.join(', '));
  // Don't throw in production to allow for runtime configuration
  if (import.meta.env.PROD) {
    console.warn('Continuing with missing environment variables. This may cause authentication to fail.');
  } else {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
}

// Azure AD Configuration
export const msalConfig: Configuration = {
  auth: {
    clientId: getEnv('AZURE_CLIENT_ID'),
    authority: `https://login.microsoftonline.com/${getEnv('AZURE_TENANT_ID', 'common')}`,
    redirectUri: getEnv('AZURE_REDIRECT_URI', window.location.origin),
    postLogoutRedirectUri: getEnv('AZURE_REDIRECT_URI', window.location.origin),
    navigateToLoginRequestUrl: false,
    knownAuthorities: [
      // For Azure AD v2.0, use the tenant ID if available, otherwise use common
      `https://login.microsoftonline.com/${getEnv('AZURE_TENANT_ID', 'common')}`
    ] as string[],
    protocolMode: 'AAD',
  },
  cache: {
    cacheLocation: BrowserCacheLocation.SessionStorage,
    storeAuthStateInCookie: false,
    secureCookies: window.location.protocol === 'https:',
  },
  system: {
    loggerOptions: {
      loggerCallback: (level: LogLevel, message: string, containsPii: boolean): void => {
        if (containsPii) return;
        const logLevel = LogLevel[level].toUpperCase();
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [MSAL] [${logLevel}]`, message);
      },
      logLevel: LogLevel.Info,
      piiLoggingEnabled: false,
    },
    windowHashTimeout: 9000, // 9 seconds
    iframeHashTimeout: 5000, // 5 seconds
    loadFrameTimeout: 0, // Disable frame timeout
  },
} as const;

// Type-safe login request configuration
export const loginRequest = {
  scopes: ['openid', 'profile', 'email', 'User.Read'],
  prompt: 'select_account',
  loginHint: '', // Optional: Pre-fill the username/email address
  domainHint: getEnv('AZURE_TENANT_ID') ? 'organizations' : undefined,
  extraQueryParameters: {
    // Add any additional query parameters here
    nux: '1', // Shows the account picker even if only one account is available
  },
} as const;

// Log the configuration (safely, without exposing sensitive data)
const logConfig = () => {
  const clientId = msalConfig.auth.clientId;
  const maskedClientId = clientId ? `***${clientId.slice(-4)}` : 'MISSING';
  
  console.group('MSAL Configuration');
  console.log('Environment:', import.meta.env.MODE);
  console.log('Client ID:', maskedClientId);
  console.log('Authority:', msalConfig.auth.authority);
  console.log('Redirect URI:', msalConfig.auth.redirectUri);
  console.log('Post Logout Redirect URI:', msalConfig.auth.postLogoutRedirectUri);
  console.log('Known Authorities:', msalConfig.auth.knownAuthorities);
  console.log('Scopes:', loginRequest.scopes);
  
  console.group('Environment Variables');
  console.log('AZURE_CLIENT_ID:', getEnv('AZURE_CLIENT_ID') ? '***' + getEnv('AZURE_CLIENT_ID').slice(-4) : 'MISSING');
  console.log('AZURE_TENANT_ID:', getEnv('AZURE_TENANT_ID', 'common'));
  console.log('AZURE_REDIRECT_URI:', getEnv('AZURE_REDIRECT_URI', 'DEFAULT_REDIRECT'));
  console.log('VITE_AZURE_CLIENT_ID:', import.meta.env.VITE_AZURE_CLIENT_ID ? '***' + String(import.meta.env.VITE_AZURE_CLIENT_ID).slice(-4) : 'MISSING');
  console.log('VITE_AZURE_TENANT_ID:', import.meta.env.VITE_AZURE_TENANT_ID || 'MISSING');
  console.log('VITE_AZURE_REDIRECT_URI:', import.meta.env.VITE_AZURE_REDIRECT_URI || 'MISSING');
  
  // Log window._env_ if it exists
  if (typeof window !== 'undefined' && (window as any)._env_) {
    console.log('Window _env_ object:', (window as any)._env_);
  }
  
  console.groupEnd();
  
  console.groupEnd();
};

// Load the runtime configuration and then log the config
if (typeof window !== 'undefined') {
  // Create a script element to load the runtime config
  const script = document.createElement('script');
  script.src = '/config.js';
  script.onload = () => {
    console.log('Runtime configuration loaded:', (window as any).__APP_CONFIG__);
    logConfig();
  };
  script.onerror = (error) => {
    console.error('Failed to load runtime configuration:', error);
    // Try to log config anyway
    logConfig();
  };
  document.head.appendChild(script);
}

// Export types for better type inference
export type MsalConfig = Configuration;
export type MsalNodeConfig = NodeConfiguration;

// Helper function to validate the configuration
export function validateMsalConfig(config: Configuration): boolean {
  try {
    if (!config.auth.clientId) {
      console.error('MSAL Configuration Error: clientId is required');
      return false;
    }
    
    if (!config.auth.authority) {
      console.error('MSAL Configuration Error: authority is required');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error validating MSAL configuration:', error);
    return false;
  }
}

// Validate the configuration on import
if (typeof window !== 'undefined') {
  validateMsalConfig(msalConfig);
}
