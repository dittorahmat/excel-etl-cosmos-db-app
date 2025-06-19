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
    endpoint: process.env.AZURE_COSMOS_ENDPOINT || '',
    key: process.env.AZURE_COSMOS_KEY || '',
    databaseName: process.env.AZURE_COSMOS_DATABASE || 'excel-upload-db',
    containerName: process.env.AZURE_COSMOS_CONTAINER || 'excel-records',
    partitionKey: process.env.AZURE_COSMOS_PARTITION_KEY || '/id',
  } as const,
} as const;
