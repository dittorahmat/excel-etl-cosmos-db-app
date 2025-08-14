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

  // Try to load environment variables from the server/.env file first, then fall back to the root .env
  const envPaths = [
    path.resolve(__dirname, '../../../.env'), // for dist
    path.resolve(__dirname, '../../.env'),   // for src
    path.resolve(process.cwd(), 'server/.env') // fallback to server/.env from root
  ];
  
  // Initialize result with proper type
  let result: { parsed: { [key: string]: string } | undefined } = { parsed: undefined };
  
  // Try each path until we find a valid .env file
  for (const envPath of envPaths) {
    console.log(`[env.ts] Attempting to load .env from: ${envPath}`);
    try {
      const envConfig = dotenv.config({ path: envPath });
      if (!envConfig.error && envConfig.parsed) {
        result = { parsed: envConfig.parsed };
        console.log(`[env.ts] Successfully loaded .env from: ${envPath}`);
        break;
      } else if (envConfig.error) {
        console.log(`[env.ts] Failed to load .env from ${envPath}: ${envConfig.error.message}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[env.ts] Error loading .env from ${envPath}:`, errorMessage);
    }
  }
  
  if (!result.parsed) {
    console.warn('[env.ts] No .env file found. Using environment variables from process.env');
    result.parsed = {}; // Initialize as empty object to prevent null reference
  }

  // Manually set process.env with the parsed values to ensure they're available
  for (const [key, value] of Object.entries(result.parsed)) {
    if (value !== undefined) {
      process.env[key] = value;
    }
  }

  console.log('[env.ts] Debugging AZURE_STORAGE_CONNECTION_STRING:', process.env.AZURE_STORAGE_CONNECTION_STRING);
  console.log('[env.ts] Debugging AZURE_COSMOSDB_ENDPOINT:', process.env.AZURE_COSMOSDB_ENDPOINT);
  console.log('[env.ts] Debugging AZURE_COSMOSDB_KEY:', process.env.AZURE_COSMOSDB_KEY);

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
