import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Azure service configuration
export const AZURE_CONFIG = {
  storage: {
    connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING || '',
    containerName: process.env.AZURE_STORAGE_CONTAINER || 'excel-uploads',
  } as const,
  cosmos: {
    connectionString: process.env.AZURE_COSMOS_CONNECTION_STRING || '',
    endpoint: process.env.AZURE_COSMOS_ENDPOINT || '',
    key: process.env.AZURE_COSMOS_KEY || '',
    databaseName: process.env.AZURE_COSMOSDB_DATABASE || 'excel-upload-db',
    containerName: process.env.AZURE_COSMOSDB_CONTAINER || 'excel-records',
    // Use the environment variable if set, otherwise default to '/id' to match the .env file
    partitionKey: process.env.AZURE_COSMOS_PARTITION_KEY || '/id',
  } as const,
} as const;

// Temporarily log Cosmos DB configuration for debugging
console.log('Cosmos DB Configuration:');
console.log('  Connection String:', AZURE_CONFIG.cosmos.connectionString ? '*****' : 'Not set');
console.log('  Endpoint:', AZURE_CONFIG.cosmos.endpoint ? AZURE_CONFIG.cosmos.endpoint : 'Not set');
console.log('  Key:', AZURE_CONFIG.cosmos.key ? '*****' : 'Not set'); // Masking key for security
console.log('  Database Name:', AZURE_CONFIG.cosmos.databaseName);
console.log('  Container Name:', AZURE_CONFIG.cosmos.containerName);
