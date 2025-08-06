import { v4 as uuidv4 } from 'uuid';
import { 
  CosmosClient, 
  Database,
  Container,
  ItemResponse,
  SqlQuerySpec,
  type CosmosClientOptions,
  type SqlParameter,
  type ContainerDefinition,
  type DatabaseResponse,
  type ContainerResponse
} from '@azure/cosmos';
import type { AzureCosmosDB, CosmosRecord } from '../../types/azure.js';
import { AZURE_CONFIG } from '../../config/azure-config.js';
import { logger } from '../../utils/logger.js';

/**
 * Initialize Azure Cosmos DB client
 * @returns Promise that resolves to the initialized AzureCosmosDB instance
 */
export async function initializeCosmosDB(): Promise<AzureCosmosDB> {
  const { 
    endpoint, 
    key, 
    databaseName, 
    containerName: defaultContainerName,
    partitionKey 
  } = AZURE_CONFIG.cosmos;

  // Debug log the Cosmos DB configuration
  logger.debug('Cosmos DB Configuration:', {
    hasEndpoint: !!endpoint,
    hasKey: !!key,
    databaseName,
    containerName: defaultContainerName,
    partitionKey
  });

  if (!endpoint || !key) {
    const errorMsg = 'Azure Cosmos DB endpoint and key must be configured. ' +
      `Endpoint: ${endpoint ? 'provided' : 'missing'}, ` +
      `Key: ${key ? 'provided' : 'missing'}`;
    
    logger.error(errorMsg);
    throw new Error(errorMsg);
  }

  // Configure client options with retry policy
  const clientOptions: CosmosClientOptions = {
    endpoint,
    key,
    connectionPolicy: {
      enableEndpointDiscovery: true,
      preferredLocations: ['East US'],
      retryOptions: {
        maxRetryAttemptCount: 5,
        maxWaitTimeInSeconds: 10,
        fixedRetryIntervalInMilliseconds: 0 // Auto-calculate retry interval
      },
    },
  };

  const cosmosClient = new CosmosClient(clientOptions);
  
  try {
    // First, check if the database exists or create it
    logger.debug(`Checking if database ${databaseName} exists...`);
    const databaseResponse: DatabaseResponse = await cosmosClient.databases.createIfNotExists({ 
      id: databaseName 
    });
    const db = databaseResponse.database;
    logger.info(`Database ${databaseName} is ready`);
    
    // Create container if it doesn't exist
    const containerDefinition: ContainerDefinition = {
      id: defaultContainerName,
      partitionKey: { 
        paths: [partitionKey],
        version: 2 // Use version 2 of the partition key
      }
    };
    
    try {
      logger.debug(`Checking if container ${defaultContainerName} exists...`);
      const containerResponse: ContainerResponse = await db.containers.createIfNotExists(containerDefinition);
      logger.info(`Container ${defaultContainerName} is ready with partition key ${partitionKey}`);
    } catch (containerError) {
      logger.error(`Error creating container ${defaultContainerName}:`, containerError);
      throw new Error(`Error creating container ${defaultContainerName}: ${(containerError as Error).message}`);
    }

    // Initialize the Cosmos DB service with all required methods
    const cosmosDb: AzureCosmosDB = {
      // The underlying CosmosClient instance
      cosmosClient,
      
      // The Cosmos DB database instance
      database: db,
      
      /**
       * Get a reference to a Cosmos DB container
       * @template T - The type of records stored in the container
       * @param {string} containerName - The name of the container
       * @param {string} partitionKey - The partition key path (e.g., '/id' or '/userId')
       * @returns {Promise<Container>} A promise that resolves to the container
       */
      container: async <T extends CosmosRecord>(
        containerName: string,
        partitionKey: string
      ): Promise<Container> => {
        try {
          logger.debug(`Getting or creating container ${containerName} with partition key ${partitionKey}`);
          const { container } = await db.containers.createIfNotExists({
            id: containerName,
            partitionKey: { 
              paths: [partitionKey],
              version: 2 // Use version 2 of the partition key
            }
          });
          logger.debug(`Successfully got container ${containerName} with id: ${container.id}`);
          return container;
        } catch (error) {
          logger.error(`Failed to get or create container ${containerName}:`, {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            containerName,
            partitionKey
          });
          throw new Error(`Failed to access container ${containerName}: ${(error as Error).message}`);
        }
      },
      
      // Add a direct container accessor for backward compatibility
      getContainer: async (containerName: string, partitionKey: string): Promise<Container> => {
        return cosmosDb.container(containerName, partitionKey);
      },
      
      /**
       * Query records from Cosmos DB
       */
      query: async <T extends CosmosRecord>(
        query: string,
        parameters: { name: string; value: unknown }[] = [],
        containerName: string = defaultContainerName
      ): Promise<T[]> => {
        try {
          const container = await db.container(containerName).read();
          const querySpec: SqlQuerySpec = {
            query,
            parameters: parameters as SqlParameter[]
          };
            
          const { resources } = await container.container.items.query<T>(querySpec).fetchAll();
          return resources;
        } catch (error) {
          logger.error(`Failed to execute query:`, { query, error });
          throw new Error(`Query execution failed: ${(error as Error).message}`);
        }
      },
      
      /**
       * Get a record by ID
       */
      getById: async <T extends CosmosRecord>(
        id: string,
        partitionKeyValue: string,
        containerName: string = defaultContainerName
      ): Promise<T | undefined> => {
        try {
          const { container } = await db.container(containerName).read();
          const { resource } = await container.item(id, partitionKeyValue).read<T>();
          return resource || undefined;
        } catch (error) {
          if ((error as any).code === 404) {
            return undefined; // Not found
          }
          logger.error(`Failed to get item ${id}:`, error);
          throw new Error(`Failed to get item ${id}: ${(error as Error).message}`);
        }
      },
      
      /**
       * Upsert a record into Cosmos DB
       */
      upsertRecord: async <T extends CosmosRecord>(
        record: T,
        containerName: string = defaultContainerName
      ): Promise<ItemResponse<T>> => {
        try {
          const { container } = await db.container(containerName).read();
          const item = {
            ...record,
            id: record.id || uuidv4(),
            _partitionKey: (record as any)._partitionKey || partitionKey,
            _ts: Math.floor(Date.now() / 1000)
          };
          return await container.items.upsert<T>(item);
        } catch (error) {
          logger.error(`Failed to upsert record:`, { record, error });
          throw new Error(`Failed to upsert record: ${(error as Error).message}`);
        }
      },
      
      /**
       * Delete a record from Cosmos DB
       */
      deleteRecord: async (
        id: string,
        partitionKeyValue: string,
        containerName: string = defaultContainerName
      ): Promise<boolean> => {
        try {
          const { container } = await db.container(containerName).read();
          const { statusCode } = await container.item(id, partitionKeyValue).delete();
          return statusCode === 204; // 204 means successfully deleted
        } catch (error) {
          if ((error as any).code === 404) {
            return false; // Not found, consider it deleted
          }
          logger.error(`Failed to delete item ${id}:`, error);
          throw new Error(`Failed to delete item ${id}: ${(error as Error).message}`);
        }
      }
    };

    return cosmosDb;
  } catch (error) {
    logger.error('Failed to initialize Cosmos DB:', error);
    throw new Error(`Failed to initialize Cosmos DB: ${(error as Error).message}`);
  }
}

/**
 * Test the Cosmos DB connection
 * @returns Promise that resolves to a result object with connection details
 */
export async function testCosmosConnection() {
  try {
    const { cosmosClient, database, container: defaultContainer } = await initializeCosmosDB();
    
    // Test query to verify the connection
    const { resources } = await database.container(defaultContainer.id).items.query('SELECT 1').fetchAll();
    
    return {
      success: true,
      message: 'Successfully connected to Cosmos DB',
      database: database.id,
      container: defaultContainer.id,
      endpoint: AZURE_CONFIG.cosmos.endpoint,
      testQueryResult: resources[0]
    };
  } catch (error) {
    logger.error('Cosmos DB connection test failed:', error);
    return {
      success: false,
      message: `Failed to connect to Cosmos DB: ${(error as Error).message}`,
      error: (error as Error).stack
    };
  }
}

// Export all required functions
export const cosmosDbService = {
  initialize: initializeCosmosDB,
  testConnection: testCosmosConnection
};

export default cosmosDbService;
