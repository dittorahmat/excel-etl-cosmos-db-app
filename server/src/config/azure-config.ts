// Import the environment variables
import { env } from './env.js';

// Define the Azure configuration type
type AzureConfig = {
  storage: {
    connectionString: string;
    containerName: string;
  };
  cosmos: {
    connectionString: string;
    endpoint: string;
    key: string;
    databaseName: string;
    containerName: string;
    partitionKey: string;
  };
};

// Cache for the configuration
let configCache: AzureConfig | null = null;

/**
 * Get the Azure configuration, initializing it if necessary
 */
function getAzureConfig(): AzureConfig {
  // Return cached config if available
  if (configCache) {
    return configCache;
  }

  // Debug: Log the environment variables we care about
  console.log('[azure-config.ts] Loading Azure configuration...');
  
  // Validate required environment variables
  const missingVars = [];
  if (!env.AZURE_STORAGE_CONNECTION_STRING) missingVars.push('AZURE_STORAGE_CONNECTION_STRING');
  if (!env.AZURE_COSMOSDB_ENDPOINT) missingVars.push('AZURE_COSMOSDB_ENDPOINT');
  if (!env.AZURE_COSMOSDB_KEY) missingVars.push('AZURE_COSMOSDB_KEY');

  if (missingVars.length > 0) {
    const errorMsg = `Missing required environment variables: ${missingVars.join(', ')}`;
    console.error(`[azure-config.ts] ERROR: ${errorMsg}`);
    throw new Error(errorMsg);
  }

  // Create the configuration object
  const config: AzureConfig = {
    storage: {
      connectionString: env.AZURE_STORAGE_CONNECTION_STRING,
      containerName: env.AZURE_STORAGE_CONTAINER || 'excel-uploads',
    },
    cosmos: {
      connectionString: '', // Not used in this configuration
      endpoint: env.AZURE_COSMOSDB_ENDPOINT,
      key: env.AZURE_COSMOSDB_KEY,
      databaseName: env.AZURE_COSMOSDB_DATABASE || 'excel-upload-db',
      containerName: env.AZURE_COSMOSDB_CONTAINER || 'excel-records',
      partitionKey: env.AZURE_COSMOSDB_PARTITION_KEY || '/id',
    },
  };

  // Log the configuration (without sensitive values)
  console.log('[azure-config.ts] Azure Configuration loaded:', {
    storage: {
      hasConnectionString: !!config.storage.connectionString,
      containerName: config.storage.containerName,
    },
    cosmos: {
      hasEndpoint: !!config.cosmos.endpoint,
      hasKey: !!config.cosmos.key,
      databaseName: config.cosmos.databaseName,
      containerName: config.cosmos.containerName,
      partitionKey: config.cosmos.partitionKey,
    },
  });

  // Cache the configuration for future use
  configCache = config;

  return config;
}

// For backward compatibility
const AZURE_CONFIG = getAzureConfig();

export { getAzureConfig, AZURE_CONFIG };
