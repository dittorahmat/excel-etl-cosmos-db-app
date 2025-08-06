import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to load environment variables
export function loadEnv() {
  // Debug: Log the current working directory and module paths
  console.log('[env.ts] Current working directory:', process.cwd());
  console.log('[env.ts] Module directory:', __dirname);

  // Try to load environment variables from multiple possible .env file locations
  const possibleEnvPaths = [
    path.resolve(process.cwd(), '.env'),       // Current working directory (server/)
    path.resolve(process.cwd(), '..', '.env'), // Project root
    path.resolve(__dirname, '../../.env'),     // Server directory (src/config/../../.env)
    path.resolve(__dirname, '../../../.env'),  // Project root (alternative path)
    '/home/ditto/Documents/work-with-hendra/etl-excel-to-cosmos-db/my-app/server/.env' // Absolute path as fallback
  ];

  let envLoaded = false;
  let lastError: Error | null = null;

  // Try each path until we successfully load the .env file
  for (const envPath of possibleEnvPaths) {
    try {
      console.log(`[env.ts] Attempting to load .env from: ${envPath}`);
      // Load with override: true to ensure we get the latest values
      const result = dotenv.config({ path: envPath, override: true });
      
      // If we got a result and no error, the file was loaded successfully
      if (result.parsed) {
        console.log(`[env.ts] Successfully loaded .env from: ${envPath}`);
        // Manually set process.env with the parsed values to ensure they're available
        for (const [key, value] of Object.entries(result.parsed)) {
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
        envLoaded = true;
        break;
      }
      
      if (result.error) {
        lastError = result.error;
        console.error(`[env.ts] Error loading .env from ${envPath}:`, result.error);
        continue;
      }
      
      console.log(`[env.ts] Successfully loaded .env from: ${envPath}`);
      console.log('[env.ts] Loaded environment variables:', Object.keys(result.parsed || {}).join(', '));
      
      // Log specific variables we care about (without values for security)
      const importantVars = [
        'AZURE_COSMOSDB_ENDPOINT',
        'AZURE_COSMOSDB_KEY',
        'AZURE_STORAGE_CONNECTION_STRING',
        'AZURE_STORAGE_CONTAINER'
      ];
      
      importantVars.forEach(varName => {
        console.log(`[env.ts] ${varName}: ${process.env[varName] ? '***' : 'Not set'}`);
      });
      
      envLoaded = true;
      break;
    } catch (error) {
      lastError = error as Error;
      console.error(`[env.ts] Error loading .env from ${envPath}:`, error);
    }
  }

  if (!envLoaded) {
    console.warn('[env.ts] WARNING: Failed to load .env file from any location');
    if (lastError) {
      console.error('[env.ts] Last error:', lastError);
    }
  }

  // Create and return the env object
  const env = {
    // Server Configuration
    PORT: process.env.PORT || '3001',
    NODE_ENV: process.env.NODE_ENV || 'development',
    AUTH_ENABLED: process.env.AUTH_ENABLED === 'true',
    
    // Azure Storage Configuration
    AZURE_STORAGE_CONNECTION_STRING: process.env.AZURE_STORAGE_CONNECTION_STRING || '',
    AZURE_STORAGE_CONTAINER: process.env.AZURE_STORAGE_CONTAINER || 'excel-uploads',
    
    // Azure Cosmos DB Configuration
    AZURE_COSMOSDB_ENDPOINT: process.env.AZURE_COSMOSDB_ENDPOINT || '',
    AZURE_COSMOSDB_KEY: process.env.AZURE_COSMOSDB_KEY || '',
    AZURE_COSMOSDB_DATABASE: process.env.AZURE_COSMOSDB_DATABASE || 'excel-upload-db',
    AZURE_COSMOSDB_CONTAINER: process.env.AZURE_COSMOSDB_CONTAINER || 'excel-records',
    AZURE_COSMOSDB_PARTITION_KEY: process.env.AZURE_COSMOSDB_PARTITION_KEY || '/id',
    
    // CORS Configuration
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:3001,http://localhost:5173',
    
    // File Upload Configuration
    FILE_SIZE_LIMIT: process.env.FILE_SIZE_LIMIT ? parseInt(process.env.FILE_SIZE_LIMIT, 10) : 10485760, // 10MB default
    
    // Logging
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    
    // Azure AD Authentication (if needed)
    AZURE_TENANT_ID: process.env.AZURE_TENANT_ID || '',
    AZURE_CLIENT_ID: process.env.AZURE_CLIENT_ID || '',
    AZURE_CLIENT_SECRET: process.env.AZURE_CLIENT_SECRET || '',
    AZURE_AUDIENCE: process.env.AZURE_AUDIENCE || '',
    AZURE_SCOPE: process.env.AZURE_SCOPE || '',
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
