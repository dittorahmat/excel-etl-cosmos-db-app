import { initializeBlobStorageAsync, initializeMockBlobStorage } from '../services/index.js';
import { initializeCosmosDB, initializeMockCosmosDB } from '../services/index.js';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { AZURE_CONFIG } from './azure-config.js';
import type { AzureBlobStorage, AzureCosmosDB } from '../types/azure.js';



/**
 * Initialize Azure services (Blob Storage and Cosmos DB)
 * @returns Promise that resolves to an object containing the initialized services
 */
export async function initializeAzureServices(): Promise<{
  blobStorage: AzureBlobStorage;
  cosmosDb: AzureCosmosDB;
}> {
  const useMocks = process.env.NODE_ENV === 'test';

  try {
    // Initialize Blob Storage
    const blobStorageInstance = useMocks
      ? (await initializeMockBlobStorage()) as unknown as AzureBlobStorage
      : await initializeBlobStorageAsync();

    // Initialize Cosmos DB
    const cosmosDbInstance = useMocks
      ? await initializeMockCosmosDB()
      : await initializeCosmosDB();
    
    return {
      blobStorage: blobStorageInstance,
      cosmosDb: cosmosDbInstance,
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



// Re-export types for backward compatibility
export type { AzureBlobStorage, AzureCosmosDB } from '../types/azure.js';

// Re-export mock functions for testing
export { initializeMockBlobStorage, initializeMockCosmosDB };
