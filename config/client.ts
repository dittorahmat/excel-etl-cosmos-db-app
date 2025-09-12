/**
 * Client-specific configuration
 */
export interface ClientConfig {
  // API
  api: {
    baseUrl: string;
    version: string;
    prefix: string;
  };
  
  // UI
  ui: {
    title: string;
    theme: string;
  };
  
  // Feature Flags
  features: {
    enableRbac: boolean;
    enableAuditLogging: boolean;
  };
}

export function getClientConfig(env: NodeJS.ProcessEnv): ClientConfig {
  // API configuration
  const apiBaseUrl = env.VITE_API_BASE_URL || '';
  const apiVersion = env.API_VERSION || '1.0.0';
  const apiPrefix = env.API_PREFIX || '/api/v1';
  
  // UI configuration
  const uiTitle = env.UI_TITLE || 'Excel to Cosmos DB';
  const uiTheme = env.UI_THEME || 'light';
  
  // Feature flags
  const enableRbac = env.ENABLE_RBAC === 'true';
  const enableAuditLogging = env.ENABLE_AUDIT_LOGGING === 'true';
  
  return {
    api: {
      baseUrl: apiBaseUrl,
      version: apiVersion,
      prefix: apiPrefix,
    },
    ui: {
      title: uiTitle,
      theme: uiTheme,
    },
    features: {
      enableRbac,
      enableAuditLogging,
    },
  };
}