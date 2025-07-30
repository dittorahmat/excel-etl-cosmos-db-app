import { CosmosClient, type SqlParameter, ItemResponse, ItemDefinition } from '@azure/cosmos';
import type { CosmosRecord, AzureCosmosDB } from '../../types/azure.js';
import { v4 as uuidv4 } from 'uuid';
import { AZURE_CONFIG } from '../../config/azure-config.js';
import { logger } from '../../utils/logger.js';



/**
 * Initialize Azure Cosmos DB client
 * @returns Promise that resolves to the initialized AzureCosmosDB instance
 */
export async function initializeCosmosDB(): Promise<AzureCosmosDB> {
  let endpoint = AZURE_CONFIG.cosmos.endpoint;
  let key = AZURE_CONFIG.cosmos.key;

  if (!endpoint || !key) {
    const connectionString = AZURE_CONFIG.cosmos.connectionString;
    if (connectionString) {
      const parts = connectionString.split(';');
      for (const part of parts) {
        if (part.startsWith('AccountEndpoint=')) {
          endpoint = part.substring('AccountEndpoint='.length);
        } else if (part.startsWith('AccountKey=')) {
          key = part.substring('AccountKey='.length);
        }
      }
    }
  }

  if (!endpoint || !key) {
    throw new Error('Azure Cosmos DB endpoint and key must be configured');
  }

  try {
    const cosmosClient = new CosmosClient({
      endpoint,
      key,
      connectionPolicy: {
        enableEndpointDiscovery: true,
        preferredLocations: ['East US'],
      },
    });

    const databaseResult = await cosmosClient.databases.createIfNotExists({
      id: AZURE_CONFIG.cosmos.databaseName,
    });
    const database = databaseResult.database;

    // Create container if it doesn't exist
    await database.containers.createIfNotExists({
      id: AZURE_CONFIG.cosmos.containerName,
      partitionKey: {
        paths: ['/_partitionKey'],  // Explicitly set to use _partitionKey
        version: 2
      },
    });
    
    logger.info('Cosmos DB container configured', {
      container: AZURE_CONFIG.cosmos.containerName,
      partitionKeyPath: '/_partitionKey'
    });

    logger.info('Successfully connected to Cosmos DB', {
      database: database.id,
      container: AZURE_CONFIG.cosmos.containerName,
      partitionKey: AZURE_CONFIG.cosmos.partitionKey
    });

    const cosmosDbInstance: AzureCosmosDB = {
      cosmosClient,
      database,
      
      container: async (containerName: string) => {
        const { container } = await database.containers.createIfNotExists({
          id: containerName,
          partitionKey: {
            paths: [AZURE_CONFIG.cosmos.partitionKey],
            version: 2
          },
        });
        
        return container;
      },
      
      // @ts-expect-error - This is a temporary workaround for the AzureCosmosDB interface
      _getPartitionKeyValue: (document: Record<string, unknown>): string => {
        if (AZURE_CONFIG.cosmos.partitionKey === '/_partitionKey') {
          return (document._partitionKey as string) || 'default';
        }
        
        const partitionKeyPath = AZURE_CONFIG.cosmos.partitionKey.startsWith('/') 
          ? AZURE_CONFIG.cosmos.partitionKey.substring(1) 
          : AZURE_CONFIG.cosmos.partitionKey;
        
        const keys = partitionKeyPath.split('.');
        let value: unknown = document;
        
        for (const key of keys) {
          if (value && typeof value === 'object' && key in value) {
            value = (value as Record<string, unknown>)[key];
          } else {
            logger.warn(`Partition key path '${partitionKeyPath}' not found in document, using 'default'`, {
              documentId: document.id,
              availableKeys: Object.keys(document)
            });
            return 'default';
          }
        }
        
        return value ? String(value) : 'default';
      },
      
      upsertRecord: async <T extends CosmosRecord>(
        record: T,
        containerName: string = AZURE_CONFIG.cosmos.containerName
      ): Promise<ItemResponse<T>> => {
        const operationId = `op_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        const recordId = record.id || 'new-record';
        
        logger.info(`[${operationId}] Starting upsert operation`, { recordId, containerName });
        
        try {
          const recordToUpsert: ItemDefinition = {
            ...record,
            id: record.id || uuidv4(),
            _ts: Math.floor(Date.now() / 1000),
            _partitionKey: record._partitionKey || 'default',
          };

          const container = database.container(containerName);
          const response = await container.items.upsert(recordToUpsert);
          
          if (!response.resource) {
            throw new Error('No resource returned from Cosmos DB');
          }
          
          logger.info(`[${operationId}] Successfully upserted record`, {
            id: response.resource.id,
            statusCode: response.statusCode,
            requestCharge: response.requestCharge
          });
          
          return response as ItemResponse<T>;
        } catch (error) {
          logger.error(`[${operationId}] Failed to upsert record`, {
            error: error instanceof Error ? error.message : 'Unknown error',
            recordId,
            containerName
          });
          throw error;
        }
      },
      
      query: async <T extends CosmosRecord>(
        queryStr: string,
        parameters: { name: string; value: unknown }[] = [],
        containerName: string = AZURE_CONFIG.cosmos.containerName
      ): Promise<T[]> => {
        const container = database.container(containerName);
        const queryParams = parameters.map(param => ({
          name: param.name,
          value: param.value === undefined || param.value === null 
            ? null 
            : typeof param.value === 'object' 
              ? JSON.stringify(param.value)
              : param.value
        }));
        
        try {
          const { resources } = await container.items.query<T>({
            query: queryStr,
            parameters: queryParams as SqlParameter[]
          }).fetchAll();
          
          return resources;
        } catch (error) {
          logger.error('Error executing query', {
            error: error instanceof Error ? error.message : 'Unknown error',
            query: queryStr,
            parameters: queryParams,
            containerName
          });
          throw error;
        }
      },
      
      getRecord: async <T extends CosmosRecord>(
        id: string,
        partitionKey: string,
        containerName: string = AZURE_CONFIG.cosmos.containerName
      ): Promise<T | null> => {
        try {
          const container = database.container(containerName);
          const { resource } = await container.item(id, partitionKey).read<T>();
          return resource || null;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          if (typeof error === 'object' && error !== null && 'code' in error && error.code === 404) {
            return null;
          }
          logger.error('Error getting record', {
            error: errorMessage,
            id,
            partitionKey,
            containerName
          });
          throw error instanceof Error ? error : new Error(errorMessage);
        }
      },
      
      deleteRecord: async (
        id: string,
        partitionKey: string,
        containerName: string = AZURE_CONFIG.cosmos.containerName
      ): Promise<void> => {
        try {
          const container = database.container(containerName);
          await container.item(id, partitionKey).delete();
        } catch (error) {
          logger.error('Error deleting record', {
            error: error instanceof Error ? error.message : 'Unknown error',
            id,
            partitionKey,
            containerName
          });
          throw error;
        }
      },
    };
    return cosmosDbInstance;
  } catch (error) {
    logger.error('Failed to initialize Cosmos DB:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      endpoint: endpoint ? 'configured' : 'missing',
      database: AZURE_CONFIG.cosmos.databaseName,
      container: AZURE_CONFIG.cosmos.containerName
    });
    throw error;
  }
}



// Export the initialize function as default for backward compatibility
export const testCosmosConnection = async () => {
  try {
    await initializeCosmosDB();
    return {
      success: true,
      message: 'Successfully connected to Cosmos DB',
      database: AZURE_CONFIG.cosmos.databaseName,
      container: AZURE_CONFIG.cosmos.containerName
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to connect to Cosmos DB',
      error: error instanceof Error ? error.message : 'Unknown error',
      endpoint: AZURE_CONFIG.cosmos.endpoint || 'not configured',
      database: AZURE_CONFIG.cosmos.databaseName
    };
  }
};

// Export all required functions
export {
  initializeCosmosDB as initialize,
  testCosmosConnection as testConnection
};

export default {
  initialize: initializeCosmosDB,
  testConnection: testCosmosConnection
};
