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
  // Check if we're in a test environment or using mocks
  const useMocks = process.env.NODE_ENV === 'test' || 
                  !AZURE_CONFIG.cosmos.endpoint || 
                  !AZURE_CONFIG.storage.connectionString;

  try {
    // Initialize Blob Storage
    blobStorageInstance = useMocks
      ? initializeMockBlobStorage()
      : await initializeBlobStorageAsync();

    // Initialize Cosmos DB
    cosmosDbInstance = useMocks
      ? initializeMockCosmosDB()
      : await initializeCosmosDB();

    // Ensure instances are not null before marking as initialized
    if (blobStorageInstance !== null && cosmosDbInstance !== null) {
      isInitialized = true;
    } else {
      throw new Error('Failed to initialize Azure services: one or more instances are null');
    }
    
    return {
      blobStorage: blobStorageInstance as AzureBlobStorage,
      cosmosDb: cosmosDbInstance as AzureCosmosDB,
    };
  } catch (error) {
    console.error('Failed to initialize Azure services:', error);
    throw new Error('Failed to initialize Azure services');
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
