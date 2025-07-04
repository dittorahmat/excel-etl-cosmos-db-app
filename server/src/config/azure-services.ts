import { initializeBlobStorageAsync, initializeMockBlobStorage } from '../services/index.js';
import { initializeCosmosDB, initializeMockCosmosDB } from '../services/index.js';
import { AZURE_CONFIG } from './azure-config.js';
import type { AzureBlobStorage, AzureCosmosDB } from '../types/azure.js';

let blobStorageInstance: AzureBlobStorage | null = null;
let cosmosDbInstance: AzureCosmosDB | null = null;
let isInitialized = false;

/**
 * Initialize Azure services (Blob Storage and Cosmos DB)
 * @returns Promise that resolves to an object containing the initialized services
 */
export async function initializeAzureServices(): Promise<{
  blobStorage: AzureBlobStorage;
  cosmosDb: AzureCosmosDB;
}> {
  console.log('Initializing Azure services...');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('AZURE_CONFIG:', {
    cosmos: {
      endpoint: AZURE_CONFIG.cosmos.endpoint ? '***' : 'Not set',
      databaseName: AZURE_CONFIG.cosmos.databaseName,
      containerName: AZURE_CONFIG.cosmos.containerName
    },
    storage: {
      connectionString: AZURE_CONFIG.storage.connectionString ? '***' : 'Not set',
      containerName: AZURE_CONFIG.storage.containerName
    }
  });

  // Check if we're in a test environment or using mocks
  const useMocks = process.env.NODE_ENV === 'test' || 
                  !AZURE_CONFIG.cosmos.endpoint || 
                  !AZURE_CONFIG.storage.connectionString;

  console.log('Use mocks:', useMocks);
  if (useMocks) {
    console.log('Using mock services because:', [
      process.env.NODE_ENV === 'test' ? 'NODE_ENV is test' : null,
      !AZURE_CONFIG.cosmos.endpoint ? 'Missing Cosmos DB endpoint' : null,
      !AZURE_CONFIG.storage.connectionString ? 'Missing Storage connection string' : null
    ].filter(Boolean).join(', '));
  }

  try {
    // Initialize Blob Storage
    console.log('Initializing Blob Storage...');
    blobStorageInstance = useMocks
      ? initializeMockBlobStorage()
      : await initializeBlobStorageAsync();
    console.log('Blob Storage initialized successfully');

    // Initialize Cosmos DB
    console.log('Initializing Cosmos DB...');
    cosmosDbInstance = useMocks
      ? initializeMockCosmosDB()
      : await initializeCosmosDB();
    console.log('Cosmos DB initialized successfully');

    // Ensure instances are not null before marking as initialized
    if (blobStorageInstance !== null && cosmosDbInstance !== null) {
      isInitialized = true;
      console.log('Azure services initialized successfully');
    } else {
      const errorMessage = 'Failed to initialize Azure services: one or more instances are null';
      console.error(errorMessage, {
        blobStorageInitialized: !!blobStorageInstance,
        cosmosDbInitialized: !!cosmosDbInstance
      });
      throw new Error(errorMessage);
    }
    
    return {
      blobStorage: blobStorageInstance as AzureBlobStorage,
      cosmosDb: cosmosDbInstance as AzureCosmosDB,
    };
  } catch (error) {
    console.error('Failed to initialize Azure services:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    throw new Error(`Failed to initialize Azure services: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get the initialized Azure Blob Storage instance
 * @throws Error if Blob Storage is not initialized
 */
export function getBlobStorage(): AzureBlobStorage {
  if (!isInitialized || !blobStorageInstance) {
    throw new Error('Blob Storage has not been initialized. Call initializeAzureServices() first.');
  }
  return blobStorageInstance;
}

/**
 * Get the initialized Azure Cosmos DB instance
 * @throws Error if Cosmos DB is not initialized
 */
export function getCosmosDb(): AzureCosmosDB {
  if (!isInitialized || !cosmosDbInstance) {
    throw new Error('Cosmos DB has not been initialized. Call initializeAzureServices() first.');
  }
  return cosmosDbInstance;
}

// Re-export types for backward compatibility
export type { AzureBlobStorage, AzureCosmosDB } from '../types/azure.js';

// Re-export mock functions for testing
export { initializeMockBlobStorage, initializeMockCosmosDB };
