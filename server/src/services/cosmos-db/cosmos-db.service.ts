
import { 
  CosmosClient, 
  Container,
  ItemResponse,
  SqlQuerySpec,
  type CosmosClientOptions,
  type SqlParameter,
  type ContainerDefinition,
    type DatabaseResponse
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

  const _cosmosClient = new CosmosClient(clientOptions);
  
  try {
    // First, check if the database exists or create it
    logger.debug('Initializing Cosmos DB client with config:', {
      endpoint: endpoint ? 'provided' : 'missing',
      key: key ? 'provided' : 'missing',
      databaseName,
      containerName: defaultContainerName,
      partitionKey
    });
    
    const databaseResponse: DatabaseResponse = await _cosmosClient.databases.createIfNotExists({ 
      id: databaseName 
    });
    
    logger.debug('Database response received:', {
      statusCode: databaseResponse.statusCode,
      database: {
        id: databaseResponse.database?.id,
        url: databaseResponse.database?.url,
        client: databaseResponse.database?.client ? 'exists' : 'missing'
      },
      headers: Object.keys(databaseResponse.headers)
    });
    
    const db = databaseResponse.database;
    if (!db) {
      throw new Error('Failed to get database instance from the response');
    }
    
    logger.info(`Database ${databaseName} is ready`, {
      databaseId: db.id,
      url: db.url,
      client: db.client ? 'exists' : 'missing'
    });
    
    // Create container if it doesn't exist
    const containerDefinition: ContainerDefinition = {
      id: defaultContainerName,
      partitionKey: { 
        paths: [partitionKey],
        version: 2 // Use version 2 of the partition key
      }
    };
    
    logger.debug('Creating/verifying container with definition:', {
      containerName: defaultContainerName,
      partitionKey,
      definition: containerDefinition
    });
    
    let container: Container;
    try {
      logger.debug(`Checking if container ${defaultContainerName} exists...`);
      const containerResponse = await db.containers.createIfNotExists(containerDefinition);
      
      logger.debug('Container response received:', {
        statusCode: containerResponse.statusCode,
        container: {
          id: containerResponse.container?.id,
          url: containerResponse.container?.url,
          database: containerResponse.container?.database ? 'exists' : 'missing'
        },
        headers: Object.keys(containerResponse.headers || {})
      });
      
      container = containerResponse.container;
      if (!container) {
        throw new Error('Failed to get container instance from the response');
      }
      
      logger.info(`Container ${defaultContainerName} is ready with partition key ${partitionKey}`, {
        containerId: container.id,
        url: container.url,
        database: container.database ? 'exists' : 'missing'
      });
      
      // Verify the container is accessible
      try {
        await container.read();
        logger.debug(`Successfully accessed container: ${defaultContainerName}`);
      } catch (accessError) {
        logger.error(`Failed to access container ${defaultContainerName}:`, accessError);
        throw new Error(`Container ${defaultContainerName} exists but is not accessible: ${(accessError as Error).message}`);
      }
    } catch (containerError) {
      logger.error(`Error creating/accessing container ${defaultContainerName}:`, containerError);
      throw new Error(`Error with container ${defaultContainerName}: ${(containerError as Error).message}`);
    }

    // Initialize the Cosmos DB service with all required methods
    const cosmosDb: AzureCosmosDB = {
      // The underlying CosmosClient instance
      cosmosClient: _cosmosClient,
      
      // The Cosmos DB database instance
      database: db,
      
      /**
       * Get a reference to a Cosmos DB container
       * @template T - The type of records stored in the container
       * @param {string} containerName - The name of the container
       * @param {string} partitionKey - The partition key path (e.g., '/id' or '/userId')
       * @returns {Promise<Container>} A promise that resolves to the container
       */
      container: async <_T extends CosmosRecord>(
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
        } catch (error: unknown) {
          const cosmosError = error as { code?: number };
          if (cosmosError.code === 404) {
            return undefined; // Not found
          }
          logger.error(`Failed to get item ${id}:`, error);
          throw new Error(`Failed to get item ${id}: ${(error as Error).message}`);
        }
      },

      /**
       * Upsert a record in Cosmos DB
       */
      upsertRecord: async <T extends CosmosRecord>(
        record: T,
        containerName: string = defaultContainerName
      ): Promise<ItemResponse<T>> => {
        try {
          const { container } = await db.container(containerName).read();
          return await container.items.upsert<T>(record);
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
        partitionKey: string,
        containerName: string = defaultContainerName
      ): Promise<void> => {
        try {
          const { container } = await db.container(containerName).read();
          await container.item(id, partitionKey).delete();
        } catch (error: unknown) {
          const cosmosError = error as { code?: number };
          if (cosmosError.code !== 404) { // Only log and rethrow if it's not a not-found error
            logger.error(`Failed to delete item ${id}:`, error);
            throw new Error(`Failed to delete item ${id}: ${(error as Error).message}`);
          }
          // If it's a 404, we consider it already deleted
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
    const { database } = await initializeCosmosDB();
    
    // Get a reference to the default container
    const containerResponse = await database.containers.createIfNotExists({
      id: AZURE_CONFIG.cosmos.containerName,
      partitionKey: { paths: ['/id'] }
    });
    
    // Get the container reference
    const container = database.container(containerResponse.container.id);
    
    // Test query to verify the connection
    const { resources } = await container.items.query('SELECT 1').fetchAll();
    
    return {
      success: true,
      message: 'Successfully connected to Cosmos DB',
      database: database.id,
      container: container.id,
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
