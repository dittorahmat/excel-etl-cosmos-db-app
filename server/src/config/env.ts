import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
// Use unified configuration
import { config } from '../../../config/index.js';

// Get the directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to load environment variables (now uses unified config)
export function loadEnv() {
  // Load environment variables from the root .env file
  const envPath = path.resolve(__dirname, '../../../.env');
  
  try {
    const envConfig = dotenv.config({ path: envPath });
    if (envConfig.error) {
      console.log(`[env.ts] Failed to load .env from ${envPath}: ${envConfig.error.message}`);
    } else {
      console.log(`[env.ts] Successfully loaded .env from: ${envPath}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[env.ts] Error loading .env from ${envPath}:`, errorMessage);
  }

  // Use the unified configuration
  const { server, shared } = config;
  
  // Check if required environment variables are set
  const requiredEnvVars = [
    'AZURE_STORAGE_CONNECTION_STRING',
    'AZURE_COSMOSDB_ENDPOINT',
    'AZURE_COSMOSDB_KEY',
    'AZURE_COSMOSDB_DATABASE',
    'AZURE_COSMOSDB_CONTAINER'
  ];
  
  const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missingEnvVars.length > 0) {
    console.warn(`[env.ts] Warning: The following required environment variables are not set: ${missingEnvVars.join(', ')}`);
    console.warn('[env.ts] This may cause issues with Azure services connectivity.');
  } else {
    console.log('[env.ts] All required environment variables are set.');
  }

  console.log('[env.ts] Debugging AZURE_STORAGE_CONNECTION_STRING:', server.azureStorage.connectionString ? 'SET' : 'NOT SET');
  console.log('[env.ts] Debugging AZURE_COSMOSDB_ENDPOINT:', server.azureCosmos.endpoint ? 'SET' : 'NOT SET');
  console.log('[env.ts] Debugging AZURE_COSMOSDB_KEY:', server.azureCosmos.key ? 'SET' : 'NOT SET');

  // Create and return the env object from unified config
  const env = {
    // Server Configuration
    PORT: server.server.port.toString(),
    NODE_ENV: shared.env.nodeEnv,
    AUTH_ENABLED: shared.auth.enabled,
    FRONTEND_URL: '',
    
    // Azure Storage Configuration
    AZURE_STORAGE_CONNECTION_STRING: server.azureStorage.connectionString,
    AZURE_STORAGE_CONTAINER: server.azureStorage.container,
    
    // Azure Cosmos DB Configuration
    AZURE_COSMOSDB_ENDPOINT: server.azureCosmos.endpoint,
    AZURE_COSMOSDB_KEY: server.azureCosmos.key,
    AZURE_COSMOSDB_DATABASE: server.azureCosmos.database,
    AZURE_COSMOSDB_CONTAINER: server.azureCosmos.container,
    AZURE_COSMOSDB_PARTITION_KEY: server.azureCosmos.partitionKey,
    
    // CORS Configuration
    ALLOWED_ORIGINS: server.cors.origins.join(','),
    
    // File Upload Configuration
    FILE_SIZE_LIMIT: server.fileUpload.sizeLimit,
    
    // Logging
    LOG_LEVEL: server.logging.level,
    
    // Azure AD Authentication (if needed)
    AZURE_TENANT_ID: shared.azure.tenantId,
    AZURE_CLIENT_ID: shared.azure.clientId,
    AZURE_CLIENT_SECRET: process.env.AZURE_CLIENT_SECRET || '',
    AZURE_AUDIENCE: process.env.AZURE_AUDIENCE || '',
    AZURE_SCOPE: shared.azure.apiScope,
  } as const;

  // Log the loaded configuration (without sensitive values)
  console.log('Environment Configuration Loaded:', {
    PORT: env.PORT,
    NODE_ENV: env.NODE_ENV,
    AUTH_ENABLED: env.AUTH_ENABLED,
    AZURE_STORAGE_CONTAINER: env.AZURE_STORAGE_CONTAINER,
    AZURE_COSMOSDB_DATABASE: env.AZURE_COSMOSDB_DATABASE,
    AZURE_COSMOSDB_CONTAINER: env.AZURE_COSMOSDB_CONTAINER,
    AZURE_COSMOSDB_PARTITION_KEY: env.AZURE_COSMOSDB_PARTITION_KEY,
    HAS_AZURE_STORAGE_CONNECTION_STRING: !!env.AZURE_STORAGE_CONNECTION_STRING,
    HAS_AZURE_COSMOSDB_ENDPOINT: !!env.AZURE_COSMOSDB_ENDPOINT,
    HAS_AZURE_COSMOSDB_KEY: !!env.AZURE_COSMOSDB_KEY,
    ALLOWED_ORIGINS: env.ALLOWED_ORIGINS,
    FILE_SIZE_LIMIT: env.FILE_SIZE_LIMIT,
    LOG_LEVEL: env.LOG_LEVEL,
  });

  return env;
}

export const env = loadEnv();
export default env;
