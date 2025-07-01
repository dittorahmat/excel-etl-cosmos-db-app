import { CosmosClient } from '@azure/cosmos';
import type { Container, Database, SqlParameter } from '@azure/cosmos';
import type { CosmosRecord, AzureCosmosDB } from '../../types/azure.js';
import { v4 as uuidv4 } from 'uuid';
import { AZURE_CONFIG } from '../../config/azure-config.js';

type CosmosResponse<T> = T & {
  id: string;
  _etag?: string;
  _ts?: number;
  _rid?: string;
  _self?: string;
  _attachments?: string;
};

let cosmosClient: CosmosClient | null = null;
let database: Database | null = null;
let _container: Container | null = null;


/**
 * Initialize Azure Cosmos DB client
 * @returns Promise that resolves to the initialized AzureCosmosDB instance
 */
export async function initializeCosmosDB(): Promise<AzureCosmosDB> {
  if (!cosmosClient) {
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

    cosmosClient = new CosmosClient({
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
    database = databaseResult.database;

    const containerResult = await database.containers.createIfNotExists({
      id: AZURE_CONFIG.cosmos.containerName,
      partitionKey: {
        paths: [AZURE_CONFIG.cosmos.partitionKey],
      },
    });
    _container = containerResult.container;
  }

  return createCosmosDbClient();
}

/**
 * Create a Cosmos DB client with the current configuration
 * @returns An instance of AzureCosmosDB
 */
export function createCosmosDbClient(): AzureCosmosDB {
  if (!cosmosClient || !database) {
    throw new Error('Cosmos client or database not initialized. Call initializeCosmosDB first.');
  }

  return {
    cosmosClient,
    database, // add this to match interface
    container: async (containerName: string, partitionKey: string) => {
      if (!database) {
        throw new Error('Database not initialized');
      }
      
      const { container } = await database.containers.createIfNotExists({
        id: containerName,
        partitionKey: {
          paths: [partitionKey],
        },
      });
      
      return container;
    },
    upsertRecord: async <T extends CosmosRecord>(
      record: T,
      containerName: string = AZURE_CONFIG.cosmos.containerName
    ): Promise<CosmosResponse<T>> => {
      const startTime = Date.now();
      const recordId = record.id || 'new-record';
      const operationId = `op_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      
      // Log the start of the operation with a unique operation ID
      console.log(`[CosmosDB][${operationId}] Starting upsert operation`, {
        recordId,
        containerName,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        operation: 'upsertRecord'
      });
      
      // Log the complete record being saved (safely)
      const safeRecord = { ...record } as any;
      // Remove potentially large fields from logging
      if (safeRecord.headers && Array.isArray(safeRecord.headers) && safeRecord.headers.length > 10) {
        safeRecord.headers = `[${safeRecord.headers.length} headers]`;
      }
      console.log(`[CosmosDB][${operationId}] Record details:`, JSON.stringify(safeRecord, null, 2));
      
      if (!database) {
        const error = new Error('Database not initialized');
        console.error(`[CosmosDB][${operationId}] Database not initialized`);
        throw error;
      }

      // Log database and container info
      console.log(`[CosmosDB][${operationId}] Database and container info:`, {
        databaseId: database?.id || 'unknown',
        containerName,
        partitionKey: AZURE_CONFIG.cosmos.partitionKey,
        endpoint: AZURE_CONFIG.cosmos.endpoint ? 'configured' : 'missing',
        recordPartitionKey: (record as any)._partitionKey || (record as any).userId || 'none'
      });

      try {
        // Create a properly typed record with all required fields
        const recordToUpsert: T & { _ts: number; _partitionKey: string } = {
          ...record,
          id: record.id || uuidv4(),
          _ts: Math.floor(Date.now() / 1000),
          _partitionKey: record._partitionKey || record.userId || 'anonymous',
          documentType: record.documentType || 'unknown',
          // Ensure we have a lastUpdated timestamp
          lastUpdated: new Date().toISOString()
        };
        
        // Log the final record that will be saved
        console.log(`[CosmosDB][${operationId}] Prepared record for upsert:`, {
          containerName,
          id: recordToUpsert.id,
          partitionKey: recordToUpsert._partitionKey,
          documentType: recordToUpsert.documentType,
          hasUserId: 'userId' in recordToUpsert,
          hasPartitionKey: '_partitionKey' in recordToUpsert,
          timestamp: new Date().toISOString()
        });

        // Get container reference with error handling
        let container;
        try {
          container = database.container(containerName);
          console.log(`[CosmosDB][${operationId}] Successfully obtained container reference:`, {
            containerId: container.id,
            databaseId: container.database.id,
            timestamp: new Date().toISOString()
          });
        } catch (containerError: any) {
          console.error(`[CosmosDB][${operationId}] Failed to get container reference:`, {
            error: containerError.message,
            code: containerError.code,
            containerName,
            databaseId: database?.id,
            timestamp: new Date().toISOString()
          });
          throw containerError;
        }

        // Execute upsert operation with detailed logging
        console.log(`[CosmosDB][${operationId}] Executing upsert operation...`, {
          recordId: recordToUpsert.id,
          partitionKey: recordToUpsert._partitionKey,
          container: container.id,
          timestamp: new Date().toISOString()
        });
        
        let resource, statusCode, requestCharge, activityId;
        try {
          const response = await container.items.upsert(recordToUpsert);
          resource = response.resource;
          statusCode = response.statusCode;
          requestCharge = response.requestCharge;
          activityId = response.activityId;
          
          console.log(`[CosmosDB][${operationId}] Upsert operation completed`, {
            statusCode,
            requestCharge,
            activityId,
            resourceId: resource?.id,
            etag: (resource as any)?._etag,
            timestamp: new Date().toISOString()
          });
        } catch (upsertError: any) {
          console.error(`[CosmosDB][${operationId}] Upsert operation failed:`, {
            error: upsertError.message,
            code: upsertError.code,
            statusCode: upsertError.statusCode,
            retryable: upsertError.retryable,
            recordId: recordToUpsert.id,
            partitionKey: recordToUpsert._partitionKey,
            container: container.id,
            timestamp: new Date().toISOString(),
            details: upsertError.body || 'No additional details',
            stack: process.env.NODE_ENV === 'development' ? upsertError.stack : undefined
          });
          throw upsertError;
        }
        
        if (!resource) {
          const error = new Error(`Failed to upsert record: No resource returned (status ${statusCode})`);
          console.error(`[CosmosDB][${operationId}] Upsert failed: No resource returned`, {
            error: error.message,
            statusCode,
            requestCharge,
            activityId,
            durationMs: Date.now() - startTime,
            operationId,
            recordId: recordToUpsert.id,
            partitionKey: recordToUpsert._partitionKey,
            timestamp: new Date().toISOString()
          });
          throw error;
        }

        // Log success with detailed information
        const duration = Date.now() - startTime;
        console.log(`[CosmosDB][${operationId}] Successfully upserted record`, {
          statusCode,
          requestCharge,
          activityId,
          durationMs: duration,
          resourceId: resource.id,
          resourceType: (resource as any).documentType,
          operationId,
          partitionKey: resource._partitionKey || recordToUpsert._partitionKey,
          etag: (resource as any)?._etag,
          timestamp: new Date().toISOString(),
          performance: {
            durationMs: duration,
            requestCharge: requestCharge,
            requestUnitsPerSecond: requestCharge / (duration / 1000) // RUs per second
          }
        });

        return resource as unknown as CosmosResponse<T>;
      } catch (error) {
        const errorId = uuidv4();
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorDetails = {
          errorId,
          timestamp: new Date().toISOString(),
          operation: 'upsertRecord',
          containerName,
          recordId: record.id || 'unknown',
          error: {
            message: errorMessage,
            code: (error as any).code,
            statusCode: (error as any).statusCode,
            retryable: (error as any).retryable,
            stack: error instanceof Error ? error.stack : undefined
          },
          record: {
            id: record.id,
            type: (record as any).documentType,
            hasUserId: 'userId' in record,
            hasPartitionKey: '_partitionKey' in record,
            partitionKey: (record as any)._partitionKey || (record as any).userId || 'none',
            containerConfig: {
              name: containerName,
              expectedPartitionKey: AZURE_CONFIG.cosmos.partitionKey
            }
          },
          environment: {
            nodeEnv: process.env.NODE_ENV,
            cosmosEndpoint: AZURE_CONFIG.cosmos.endpoint ? 'configured' : 'missing',
            databaseName: AZURE_CONFIG.cosmos.databaseName,
            containerName: AZURE_CONFIG.cosmos.containerName
          }
        };

        console.error(`[CosmosDB][${errorId}] Error in upsertRecord:`, JSON.stringify(errorDetails, null, 2));
        
        // Create a more descriptive error with all relevant information
        const enhancedError = new Error(`[${errorId}] Failed to upsert record: ${errorMessage}`);
        (enhancedError as any).details = errorDetails;
        
        throw enhancedError;
      }
    },
    query: async <T extends CosmosRecord>(
      queryStr: string,
      parameters: { name: string; value: unknown }[] = [],
      containerName: string = AZURE_CONFIG.cosmos.containerName
    ): Promise<T[]> => {
      if (!database) {
        throw new Error('Database not initialized');
      }

      const container = database.container(containerName);
      
      // Prepare parameters for Cosmos DB query
      const queryParams = parameters.map(param => {
        // Convert parameter value to a valid JSON value (string, number, boolean, null)
        let value = param.value;
        
        // Handle different value types
        if (value === undefined || value === null) {
          // Convert undefined or null to null for Cosmos DB
          value = null;
        } else if (typeof value === 'object') {
          // Stringify objects and arrays
          value = JSON.stringify(value);
        } else if (typeof value !== 'string' && 
                  typeof value !== 'number' && 
                  typeof value !== 'boolean') {
          // Convert any other non-JSON-serializable values to strings
          value = String(value);
        }
        
        // At this point, value is guaranteed to be string | number | boolean | null
        return {
          name: param.name,
          value: value as string | number | boolean | null
        };
      });
      
      // Execute the query with properly typed parameters
      const { resources } = await container.items.query<T>({
        query: queryStr,
        parameters: queryParams as SqlParameter[]
      }).fetchAll();

      return resources;
    },
    getById: async <T extends CosmosRecord>(
      id: string,
      partitionKey: string,
      containerName: string = AZURE_CONFIG.cosmos.containerName
    ): Promise<T | undefined> => {
      if (!database) {
        throw new Error('Database not initialized');
      }

      try {
        const container = database.container(containerName);
        const { resource } = await container.item(id, partitionKey).read<T>();
        return resource as unknown as CosmosResponse<T>;
      } catch (error) {
        if (error && typeof error === 'object' && 'code' in error && error.code === 404) {
          return undefined;
        }
        throw error;
      }
    },
    deleteRecord: async (
      id: string,
      partitionKey: string,
      containerName: string = AZURE_CONFIG.cosmos.containerName
    ): Promise<void> => {
      if (!database) {
        throw new Error('Database not initialized');
      }

      const container = database.container(containerName);
      await container.item(id, partitionKey).delete();
    },
  };
}

/**
 * Get or initialize the Azure Cosmos DB client
 * @returns Promise that resolves to the initialized AzureCosmosDB instance
 */
export async function getOrInitializeCosmosDB(): Promise<AzureCosmosDB> {
  if (!cosmosClient || !database) {
    return initializeCosmosDB();
  }
  return createCosmosDbClient();
}

// Export the initialize function as default for backward compatibility
export default {
  initialize: initializeCosmosDB,
  getOrInitialize: getOrInitializeCosmosDB,
  testConnection: testCosmosConnection
};

/**
 * Test the Cosmos DB connection and container configuration
 * @returns Promise that resolves to a status object with connection details
 */
export async function testCosmosConnection(): Promise<{
  success: boolean;
  message: string;
  details: {
    isConnected: boolean;
    databaseName: string;
    containerName: string;
    partitionKey: string;
    containerExists: boolean;
    containerPartitionKey: string | null;
    error?: string;
  };
}> {
  const startTime = Date.now();
  const result = {
    success: false,
    message: '',
    details: {
      isConnected: false,
      databaseName: AZURE_CONFIG.cosmos.databaseName,
      containerName: AZURE_CONFIG.cosmos.containerName,
      partitionKey: AZURE_CONFIG.cosmos.partitionKey,
      containerExists: false,
      containerPartitionKey: null as string | null,
      error: undefined as string | undefined
    }
  };

  try {
    console.log('[CosmosDB] Testing connection and configuration...');
    
    // Initialize client if not already done
    if (!cosmosClient) {
      await initializeCosmosDB();
    }

    if (!cosmosClient || !database) {
      throw new Error('Failed to initialize Cosmos DB client');
    }

    result.details.isConnected = true;
    
    // Check if container exists and get its properties
    try {
      const container = database.container(AZURE_CONFIG.cosmos.containerName);
      const { resource: containerProps } = await container.read();
      
      if (containerProps) {
        result.details.containerExists = true;
        result.details.containerPartitionKey = containerProps.partitionKey?.paths?.[0] || null;
        
        // Verify partition key matches expected
        if (result.details.containerPartitionKey !== AZURE_CONFIG.cosmos.partitionKey) {
          console.warn(`[CosmosDB] Partition key mismatch. Expected ${AZURE_CONFIG.cosmos.partitionKey}, found ${result.details.containerPartitionKey}`);
          result.details.error = `Partition key mismatch. Expected ${AZURE_CONFIG.cosmos.partitionKey}, found ${result.details.containerPartitionKey}`;
          result.message = 'Configuration warning: Partition key mismatch';
          result.success = false;
        } else {
          result.message = 'Connection test successful';
          result.success = true;
        }
      }
    } catch (containerError: any) {
      result.details.error = `Container error: ${containerError.message}`;
      result.message = 'Container check failed';
      console.error('[CosmosDB] Container check failed:', containerError);
    }

    return result;
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    result.details.error = errorMessage;
    result.message = 'Connection test failed';
    console.error('[CosmosDB] Connection test failed:', error);
    return result;
  } finally {
    console.log(`[CosmosDB] Connection test completed in ${Date.now() - startTime}ms`, {
      success: result.success,
      message: result.message,
      details: result.details
    });
  }
}

