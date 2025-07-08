import { Configuration, LogLevel, BrowserCacheLocation } from '@azure/msal-browser';
import type { Configuration as NodeConfiguration } from '@azure/msal-node';

// Define the shape of the window.__AZURE_ENV__ and window.__APP_CONFIG__ objects
declare global {
  interface Window {
    __AZURE_ENV__?: Record<string, string>;
    __APP_CONFIG__?: Record<string, string>;
  }
}

// Environment variable helper with type safety and better error reporting
const getEnv = (key: string, defaultValue: string = ''): string => {
  // 1. First try Vite environment variables (injected at build time from GitHub Secrets)
  const viteValue = import.meta.env[`VITE_${key}`];
  if (viteValue !== undefined && viteValue !== '') {
    return viteValue;
  }

  // 2. Try to get from window.__APP_CONFIG__ (injected by our runtime config)
  if (typeof window !== 'undefined' && window.__APP_CONFIG__) {
    const runtimeValue = window.__APP_CONFIG__[`VITE_${key}`];
    if (runtimeValue !== undefined && runtimeValue !== '') {
      return runtimeValue;
    }
  }
  
  // 3. Try to get from window.__AZURE_ENV__ (legacy Azure SWA injection)
  if (typeof window !== 'undefined' && window.__AZURE_ENV__) {
    const azureEnvValue = window.__AZURE_ENV__[`VITE_${key}`];
    if (azureEnvValue !== undefined && azureEnvValue !== '') {
      return azureEnvValue;
    }
  }
  
  // 4. Try direct access (for Node.js environment during SSR)
  const processValue = import.meta.env[`${key}`];
  if (processValue !== undefined && processValue !== '') {
    return processValue;
  }
  
  // Log a warning if we're in development mode
  if (import.meta.env.DEV) {
    console.warn(`Environment variable VITE_${key} is not set. Using default value.`);
  } else {
    // In production, log to the server if possible
    console.error(`Environment variable VITE_${key} is not set in production!`);
    // Also log the current environment for debugging
    console.log('Current environment:', import.meta.env.MODE);
    console.log('Available environment variables:', Object.keys(import.meta.env).filter(k => k.startsWith('VITE_')));
  }
  
  return defaultValue;
};

// Validate required environment variables



// Azure AD Configuration
export const msalConfig: Configuration = {
  auth: {
    clientId: getEnv('AZURE_CLIENT_ID'),
    // Use 'organizations' as authority to support both work/school accounts and personal Microsoft accounts
    authority: 'https://login.microsoftonline.com/organizations',
    redirectUri: getEnv('AZURE_REDIRECT_URI', window.location.origin),
    postLogoutRedirectUri: getEnv('AZURE_REDIRECT_URI', window.location.origin),
    navigateToLoginRequestUrl: false,
    // Known authorities for both the tenant and common endpoints
    knownAuthorities: [
      'login.microsoftonline.com',
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
  // Use 'select_account' to always show account picker
  prompt: 'select_account',
  // Add domain hint to help with B2B authentication
  extraQueryParameters: {
    domain_hint: 'organizations',
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
  
  
  
  console.groupEnd();
};

// Log the configuration on import in development
if (import.meta.env.DEV) {
  logConfig();
}

// Log the current environment
console.log('Current environment:', import.meta.env.MODE);
console.log('Is production?', import.meta.env.PROD);

// Log the runtime config if available
if (typeof window !== 'undefined' && (window as Window & typeof globalThis).__APP_CONFIG__) {
  console.log('Runtime config loaded:', (window as Window & typeof globalThis).__APP_CONFIG__);
} else {
  console.warn('Runtime config (window.__APP_CONFIG__) is not available');
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
validateMsalConfig(msalConfig);

