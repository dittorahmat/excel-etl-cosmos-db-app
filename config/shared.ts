/**
 * Shared configuration used by both client and server
 */
export interface SharedConfig {
  // Azure Configuration
  azure: {
    tenantId: string;
    clientId: string;
    redirectUri: string;
    scopes: string[];
    authority: string;
    apiScope: string;
  };
  
  // Authentication
  auth: {
    enabled: boolean;
  };
  
  // API
  api: {
    baseUrl: string;
  };
  
  // Environment
  env: {
    nodeEnv: string;
    isDevelopment: boolean;
    isProduction: boolean;
  };
}

export function getSharedConfig(env: NodeJS.ProcessEnv): SharedConfig {
  // Authentication enabled flag
  const authEnabled = env.AUTH_ENABLED === 'true' || env.VITE_AUTH_ENABLED === 'true';
  
  // Azure configuration
  const tenantId = env.AZURE_TENANT_ID || env.VITE_AZURE_TENANT_ID || '';
  const clientId = env.AZURE_CLIENT_ID || env.VITE_AZURE_CLIENT_ID || '';
  const redirectUri = env.VITE_AZURE_REDIRECT_URI || 'http://localhost:3000';
  const scopes = (env.VITE_AZURE_SCOPES || 'User.Read openid profile email').split(' ');
  const authority = env.VITE_AZURE_AUTHORITY || `https://login.microsoftonline.com/${tenantId}`;
  const apiScope = env.VITE_API_SCOPE || `api://${clientId}/access_as_user`;
  
  // API configuration
  const apiBaseUrl = env.VITE_API_BASE_URL || '';
  
  // Environment
  const nodeEnv = env.NODE_ENV || 'development';
  const isDevelopment = nodeEnv === 'development';
  const isProduction = nodeEnv === 'production';
  
  return {
    azure: {
      tenantId,
      clientId,
      redirectUri,
      scopes,
      authority,
      apiScope,
    },
    auth: {
      enabled: authEnabled,
    },
    api: {
      baseUrl: apiBaseUrl,
    },
    env: {
      nodeEnv,
      isDevelopment,
      isProduction,
    },
  };
}