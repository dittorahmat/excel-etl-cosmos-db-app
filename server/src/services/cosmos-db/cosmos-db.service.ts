import { CosmosClient } from '@azure/cosmos';
import type { Container, Database, SqlParameter } from '@azure/cosmos';
import type { CosmosRecord, AzureCosmosDB } from '../../types/azure.js';
import { v4 as uuidv4 } from 'uuid';
import { AZURE_CONFIG } from '../../config/azure-config.js';

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
    ): Promise<T> => {
      if (!database) {
        throw new Error('Database not initialized');
      }

      const container = database.container(containerName);
      const { resource } = await container.items.upsert<T>({
        ...record,
        id: record.id || uuidv4(),
        _ts: Math.floor(Date.now() / 1000),
      });

      if (!resource) {
        throw new Error('Failed to upsert record');
      }

      return resource as T;
    },
    query: async <T extends CosmosRecord>(
      query: string,
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
        query,
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
        return resource;
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
  if (!cosmosClient) {
    return initializeCosmosDB();
  }
  return createCosmosDbClient();
}
