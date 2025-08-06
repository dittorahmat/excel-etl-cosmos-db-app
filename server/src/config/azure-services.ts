import { initializeBlobStorageAsync, initializeMockBlobStorage } from '../services/index.js';
import { initializeCosmosDB, initializeMockCosmosDB } from '../services/index.js';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { AZURE_CONFIG } from './azure-config.js';
import type { AzureBlobStorage, AzureCosmosDB } from '../types/azure.js';
import { logger } from '../utils/logger.js';

/**
 * Initialize Azure services (Blob Storage and Cosmos DB)
 * @returns Promise that resolves to an object containing the initialized services
 */
export async function initializeAzureServices(): Promise<{
  blobStorage: AzureBlobStorage;
  cosmosDb: AzureCosmosDB;
}> {
  const useMocks = process.env.NODE_ENV === 'test';
  logger.info('Initializing Azure services...', { useMocks });

  try {
    // Initialize Blob Storage
    logger.debug('Initializing Azure Blob Storage...');
    const blobStorageInstance = useMocks
      ? (await initializeMockBlobStorage()) as unknown as AzureBlobStorage
      : await initializeBlobStorageAsync();

    logger.info('Azure Blob Storage initialized successfully');

    // Initialize Cosmos DB
    logger.debug('Initializing Azure Cosmos DB...');
    const cosmosDbInstance = useMocks
      ? await initializeMockCosmosDB()
      : await initializeCosmosDB();
    
    // Log the Cosmos DB instance structure for debugging
    if (cosmosDbInstance) {
      // Log the raw Cosmos DB instance structure for debugging
      logger.debug('Raw Cosmos DB instance structure:', {
        type: typeof cosmosDbInstance,
        constructor: cosmosDbInstance?.constructor?.name,
        prototype: Object.getPrototypeOf(cosmosDbInstance || {}),
        ownPropertyNames: Object.getOwnPropertyNames(cosmosDbInstance),
        propertyDescriptors: Object.getOwnPropertyNames(cosmosDbInstance).reduce((acc, key) => {
          try {
            acc[key] = {
              type: typeof cosmosDbInstance[key as keyof typeof cosmosDbInstance],
              isFunction: typeof cosmosDbInstance[key as keyof typeof cosmosDbInstance] === 'function',
              isObject: typeof cosmosDbInstance[key as keyof typeof cosmosDbInstance] === 'object',
              value: cosmosDbInstance[key as keyof typeof cosmosDbInstance]
            };
          } catch (e) {
            acc[key] = { error: 'Could not access property' };
          }
          return acc;
        }, {} as Record<string, unknown>)
      });

      // Log the Cosmos DB instance properties we care about
      logger.debug('Azure Cosmos DB initialized successfully', {
        hasCosmosClient: 'cosmosClient' in cosmosDbInstance,
        cosmosClientType: 'cosmosClient' in cosmosDbInstance ? typeof cosmosDbInstance.cosmosClient : 'n/a',
        hasDatabase: 'database' in cosmosDbInstance,
        databaseType: 'database' in cosmosDbInstance ? typeof cosmosDbInstance.database : 'n/a',
        databaseId: 'database' in cosmosDbInstance && cosmosDbInstance.database ? 
          (cosmosDbInstance.database as any).id || 'unknown' : 'n/a',
        hasContainerMethod: typeof cosmosDbInstance.container === 'function',
        availableMethods: Object.getOwnPropertyNames(cosmosDbInstance)
      });
      
      // Verify the database is accessible
      try {
        if ('database' in cosmosDbInstance && cosmosDbInstance.database) {
          const dbInfo = await cosmosDbInstance.database.read();
          logger.debug('Successfully accessed Cosmos DB database', {
            id: dbInfo.database.id,
            resourceId: dbInfo.resource?._rid,
            lastModified: dbInfo.resource?._ts ? new Date(dbInfo.resource._ts * 1000).toISOString() : 'unknown',
            databaseProperties: Object.getOwnPropertyNames(dbInfo.database)
          });
          
          // Log the database methods
          const db = cosmosDbInstance.database as any;
          logger.debug('Cosmos DB database methods:', {
            container: typeof db.container === 'function' ? 'function' : 'not a function',
            containers: typeof db.containers === 'object' ? 'object' : 'not an object',
            user: typeof db.user === 'function' ? 'function' : 'not a function',
            users: typeof db.users === 'object' ? 'object' : 'not an object',
            client: db.client ? 'exists' : 'does not exist'
          });
        } else {
          logger.error('Cosmos DB instance does not have a database property or it is null/undefined', {
            hasDatabaseProperty: 'database' in cosmosDbInstance,
            databaseValue: (cosmosDbInstance as any).database
          });
        }
      } catch (dbError) {
        logger.error('Failed to access Cosmos DB database', {
          error: dbError instanceof Error ? dbError.message : 'Unknown error',
          stack: dbError instanceof Error ? dbError.stack : undefined,
          cosmosDbInstance: {
            type: typeof cosmosDbInstance,
            properties: Object.getOwnPropertyNames(cosmosDbInstance),
            hasDatabase: 'database' in cosmosDbInstance,
            databaseType: 'database' in cosmosDbInstance ? typeof (cosmosDbInstance as any).database : 'n/a'
          }
        });
        throw new Error(`Failed to access Cosmos DB database: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
      }
    } else {
      logger.error('Cosmos DB instance is null or undefined');
      throw new Error('Failed to initialize Cosmos DB: instance is null or undefined');
    }
    
    return {
      blobStorage: blobStorageInstance,
      cosmosDb: cosmosDbInstance,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    logger.error('Failed to initialize Azure services', {
      error: errorMessage,
      stack: errorStack,
      errorDetails: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : 'Non-Error object thrown'
    });
    
    throw new Error(`Failed to initialize Azure services: ${errorMessage}`);
  }
}



// Re-export types for backward compatibility
export type { AzureBlobStorage, AzureCosmosDB } from '../types/azure.js';

// Re-export mock functions for testing
export { initializeMockBlobStorage, initializeMockCosmosDB };
