namespace NodeJS {
  interface ProcessEnv {
    // Server
    NODE_ENV: 'development' | 'production' | 'test';
    PORT?: string;
    HOST?: string;
    
    // Azure Storage
    AZURE_STORAGE_CONNECTION_STRING?: string;
    AZURE_STORAGE_CONTAINER: string;
    
    // Azure Cosmos DB
    AZURE_COSMOS_ENDPOINT?: string;
    AZURE_COSMOS_KEY?: string;
    AZURE_COSMOS_DATABASE: string;
    AZURE_COSMOS_CONTAINER: string;
    AZURE_COSMOS_PARTITION_KEY: string;
    
    // Azure AD Authentication
    AZURE_AD_CLIENT_ID: string;
    AZURE_AD_TENANT_ID: string;
    AZURE_AD_CLIENT_SECRET: string;
    AZURE_AD_REDIRECT_URI: string;
    
    // API Key Configuration
    API_KEYS_ENABLED?: string;
    API_KEY_DEFAULT_EXPIRATION_DAYS?: string;
    API_KEY_MAX_KEYS_PER_USER?: string;
    API_KEY_RATE_LIMIT?: string;
    API_KEY_ENABLE_IP_RESTRICTIONS?: string;
    API_KEY_ALLOWED_IPS?: string;
    API_KEY_LOGGING_ENABLED?: string;
    API_KEY_USAGE_RETENTION_DAYS?: string;
    
    // JWT Configuration
    JWT_SECRET: string;
    JWT_EXPIRES_IN: string;
    
    // Logging
    LOG_LEVEL?: 'error' | 'warn' | 'info' | 'http' | 'verbose' | 'debug' | 'silly';
    LOG_TO_FILE?: string;
    LOG_FILE_PATH?: string;
    
    // CORS
    CORS_ORIGIN?: string;
    
    // Rate Limiting
    RATE_LIMIT_WINDOW_MS?: string;
    RATE_LIMIT_MAX?: string;
  }
}

// This export is needed for TypeScript to treat this file as a module
export {};
