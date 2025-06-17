import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import { CosmosClient, Container } from '@azure/cosmos';
import { DefaultAzureCredential } from '@azure/identity';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import type { Request } from 'express';
import type { Multer } from 'multer';

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

// Type definitions
export interface AzureBlobStorage {
  blobServiceClient: BlobServiceClient;
  getContainerClient: (containerName: string) => ContainerClient;
  uploadFile: (containerName: string, file: Express.Multer.File) => Promise<{
    url: string;
    name: string;
    size: number;
  }>;
  deleteFile: (containerName: string, fileName: string) => Promise<void>;
}

// Base type for all Cosmos DB records
export type CosmosRecord = Record<string, unknown> & {
  id: string;
};

/**
 * Interface for interacting with Azure Cosmos DB
 * Provides a type-safe wrapper around the Cosmos DB client
 */
export interface AzureCosmosDB {
  /** The underlying CosmosClient instance */
  cosmosClient: CosmosClient;
  
  /** The Cosmos DB database instance */
  database: any;
  
  /**
   * Gets a reference to a Cosmos DB container
   * @template T - The type of records stored in the container
   * @param {string} containerName - The name of the container
   * @param {string} partitionKey - The partition key path (e.g., '/id' or '/userId')
   * @returns {Promise<Container>} A promise that resolves to the container reference
   */
  container: <T extends CosmosRecord>(
    containerName: string, 
    partitionKey: string
  ) => Promise<Container>;
  
  /**
   * Upserts a record into the specified container
   * @template T - The type of the record
   * @param {T} record - The record to upsert
   * @param {string} [containerName] - Optional container name (defaults to the one from config)
   * @returns {Promise<T>} A promise that resolves to the upserted record with generated ID
   */
  upsertRecord: <T extends CosmosRecord>(
    record: T, 
    containerName?: string
  ) => Promise<T>;
  
  /**
   * Queries records from the specified container
   * @template T - The type of records to return
   * @param {string} query - The SQL query string
   * @param {{ name: string; value: any }[]} [parameters] - Optional query parameters
   * @param {string} [containerName] - Optional container name (defaults to the one from config)
   * @returns {Promise<T[]>} A promise that resolves to an array of matching records
   */
  query: <T extends CosmosRecord>(
    query: string, 
    parameters?: { name: string; value: any }[],
    containerName?: string
  ) => Promise<T[]>;
  
  /**
   * Gets a record by its ID and partition key
   * @template T - The expected return type
   * @param {string} id - The ID of the record to retrieve
   * @param {string} partitionKey - The partition key value
   * @param {string} [containerName] - Optional container name (defaults to the one from config)
   * @returns {Promise<T | undefined>} A promise that resolves to the found record or undefined
   */
  getById: <T extends CosmosRecord>(
    id: string, 
    partitionKey: string, 
    containerName?: string
  ) => Promise<T | undefined>;
  
  /**
   * Deletes a record by its ID and partition key
   * @param {string} id - The ID of the record to delete
   * @param {string} partitionKey - The partition key value
   * @param {string} [containerName] - Optional container name (defaults to the one from config)
   * @returns {Promise<void>} A promise that resolves when the record is deleted
   */
  deleteRecord: (
    id: string, 
    partitionKey: string, 
    containerName?: string
  ) => Promise<void>;
}

let cosmosDbInstance: AzureCosmosDB | null = null;

// Azure Blob Storage clients
let blobStorageInstance: AzureBlobStorage | null = null;
let blobServiceClient: BlobServiceClient | any;
let containerClient: ContainerClient | any;
let containerName: string;
const useMockStorage = !process.env.AZURE_STORAGE_CONNECTION_STRING || process.env.NODE_ENV === 'test';

// Azure Cosmos DB clients
let cosmosClient: CosmosClient | any;
let cosmosContainer: Container | any;
const useMockCosmos = !process.env.AZURE_COSMOS_CONNECTION_STRING;
const mockCosmosData = new Map<string, any>();

// Initialize mock Cosmos DB client for testing
const initializeMockCosmosDB = () => {
  const mockItems: any[] = [];
  
  // Mock Cosmos DB container methods
  const mockContainer = {
    items: {
      query: jest.fn().mockReturnThis(),
      fetchAll: jest.fn().mockResolvedValue({ resources: mockItems }),
      create: jest.fn().mockImplementation((item: any) => {
        mockItems.push(item);
        return { resource: item };
      }),
      upsert: jest.fn().mockImplementation((item: any) => {
        const index = mockItems.findIndex((i: any) => i.id === item.id);
        if (index >= 0) {
          mockItems[index] = { ...mockItems[index], ...item };
          return { resource: mockItems[index] };
        }
        mockItems.push(item);
        return { resource: item };
      }),
      delete: jest.fn().mockImplementation((id: string) => {
        const index = mockItems.findIndex((i: any) => i.id === id);
        if (index >= 0) {
          mockItems.splice(index, 1);
          return { resource: { id } };
        }
        return { resource: undefined };
      }),
    },
  };

  return {
    container: jest.fn().mockReturnValue(mockContainer),
    database: {
      container: jest.fn().mockReturnValue(mockContainer)
    },
    items: {
      query: jest.fn().mockReturnThis(),
      fetchAll: jest.fn().mockResolvedValue({ resources: mockItems }),
    },
  };
};

// Initialize mock storage for development
const initializeMockBlobStorage = (): AzureBlobStorage => {
  const mockBlobs = new Map<string, any>();

  const mockBlockBlobClient = {
    uploadData: jest.fn().mockImplementation((data: any) => {
      return Promise.resolve({
        requestId: `mock-${Date.now()}`,
        clientRequestId: '',
        version: '1.0',
        date: new Date(),
        errorCode: undefined,
        'content-md5': '',
        'last-modified': new Date(),
        'x-ms-request-id': `mock-${Date.now()}`,
        'x-ms-version': '2021-06-08',
        'x-ms-request-server-encrypted': true
      });
    }),
    delete: jest.fn().mockImplementation(() => Promise.resolve({
      _response: {
        status: 204,
        parsedHeaders: {},
        request: {},
        headers: {},
      },
    })),
    url: '',
  };

  const mockContainerClient = {
    getBlockBlobClient: jest.fn().mockReturnValue(mockBlockBlobClient),
    exists: jest.fn().mockResolvedValue(true),
    createIfNotExists: jest.fn().mockResolvedValue({}),
  };

  const mockBlobServiceClient = {
    getContainerClient: jest.fn().mockReturnValue(mockContainerClient),
  };

  return {
    blobServiceClient: mockBlobServiceClient as unknown as BlobServiceClient,
    getContainerClient: jest.fn().mockReturnValue(mockContainerClient as unknown as ContainerClient),
    uploadFile: jest.fn().mockImplementation(async (containerName: string, file: Express.Multer.File) => {
      return {
        url: `https://mockstorage.blob.core.windows.net/${containerName}/${file.originalname}`,
        name: file.originalname,
        size: file.size
      };
    }),
    deleteFile: jest.fn().mockImplementation(async (containerName: string, fileName: string) => {
      // Mock implementation of deleteFile
      return Promise.resolve();
    })
  };
};

/**
 * Initialize Azure Blob Storage client
 */
export const initializeBlobStorage = (): void => {
  // In development or test environment without connection string, use mock storage
  if (useMockStorage) {
    console.warn('Azure Storage connection string not found. Using mock storage for development.');
    return;
  }

  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  
  if (!connectionString) {
    throw new Error('Azure Storage connection string is not configured');
  }

  try {
    // Create the BlobServiceClient object which will be used to create a container client
    blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    
    // Get a reference to the container
    containerName = process.env.AZURE_STORAGE_CONTAINER || 'excel-uploads';
    containerClient = blobServiceClient.getContainerClient(containerName);
    
    console.log('Azure Blob Storage client initialized');
  } catch (error) {
    console.error('Failed to initialize Azure Blob Storage:', error);
    throw new Error('Failed to initialize Azure Blob Storage');
  }
};

/**
 * Initialize Azure Blob Storage client
 */
export const initializeBlobStorageAsync = async (): Promise<AzureBlobStorage> => {
  if (blobStorageInstance) {
    return blobStorageInstance;
  }

  // In test environment, return a simple mock implementation
  if (process.env.NODE_ENV === 'test') {
    const mockBlobClient = {
      upload: async () => ({}),
      delete: async () => ({}),
    };
    
    const mockContainerClient = {
      createIfNotExists: async () => ({}),
      getBlockBlobClient: () => mockBlobClient,
    };

    const mockBlobServiceClient = {
      getContainerClient: () => mockContainerClient,
    };

    blobStorageInstance = {
      blobServiceClient: mockBlobServiceClient as unknown as BlobServiceClient,
      getContainerClient: () => mockContainerClient as unknown as ContainerClient,
      uploadFile: async () => ({
        url: 'https://test.blob.core.windows.net/container/filename.xlsx',
        name: 'test-file.xlsx',
        size: 1024,
      }),
      deleteFile: async () => Promise.resolve(),
    };
    return blobStorageInstance;
  }

  // In production/development, use real Azure Blob Storage
  if (!AZURE_CONFIG.storage.connectionString) {
    throw new Error('Azure Storage connection string is not configured');
  }

  const blobServiceClient = BlobServiceClient.fromConnectionString(
    AZURE_CONFIG.storage.connectionString
  );

  const getContainerClient = (containerName: string): ContainerClient => {
    return blobServiceClient.getContainerClient(containerName);
  };

  const uploadFile = async (
    containerName: string,
    file: Express.Multer.File
  ) => {
    const containerClient = getContainerClient(containerName);
    await containerClient.createIfNotExists({ access: 'blob' });

    const blobName = `${Date.now()}-${file.originalname}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    await blockBlobClient.upload(file.buffer, file.size);

    return {
      url: blockBlobClient.url,
      name: blobName,
      size: file.size,
    };
  };

  blobStorageInstance = {
    blobServiceClient,
    getContainerClient,
    uploadFile,
    deleteFile,
  };

  return blobStorageInstance;
};

/**
 * Initialize Azure Cosmos DB client
 */
export const initializeCosmosDB = async (): Promise<AzureCosmosDB> => {
  if (cosmosDbInstance) {
    return cosmosDbInstance;
  }

  if (process.env.NODE_ENV === 'test') {
    // Create a mock implementation that matches the AzureCosmosDB interface
    const mockDb: Record<string, CosmosRecord> = {};
    
    const mockContainer = {
      items: {
        upsert: async <T extends CosmosRecord>(record: T) => {
          const id = record.id || 'test-id';
          mockDb[id] = { ...record, id };
          return { resource: mockDb[id] };
        },
        query: () => ({
          fetchAll: async () => ({
            resources: Object.values(mockDb)
          })
        })
      },
      item: (id: string) => ({
        read: async () => ({
          resource: mockDb[id]
        }),
        delete: async () => {
          delete mockDb[id];
          return { statusCode: 204 };
        }
      })
    };

    const mockCosmosDb: AzureCosmosDB = {
      cosmosClient: {} as CosmosClient,
      database: {},
      container: async () => mockContainer as unknown as Container,
      upsertRecord: async <T extends CosmosRecord>(record: T) => {
        const id = record.id || 'test-id';
        mockDb[id] = { ...record, id };
        return mockDb[id] as T;
      },
      query: async <T extends CosmosRecord>() => {
        return Object.values(mockDb) as T[];
      },
      getById: async <T extends CosmosRecord>(id: string) => {
        return mockDb[id] as T | undefined;
      },
      deleteRecord: async (id: string) => {
        delete mockDb[id];
      }
    };

    cosmosDbInstance = mockCosmosDb;
    return mockCosmosDb;
  }

    const mockContainer = {
      items: mockItems,
      read: async () => ({}),
      item: (id: string, partitionKey: string) => ({
        read: async () => ({
          resource: mockDb[id] || null
        })
      })
    } as unknown as Container;

    // Create the mock AzureCosmosDB instance
    const mockCosmosDb: AzureCosmosDB = {
      cosmosClient: {} as unknown as CosmosClient,
      database: {} as any, // Not used in mock implementation
      
      // Container method implementation
      async container<T extends CosmosRecord>(
        containerName: string,
        partitionKey: string
      ): Promise<Container> {
        return mockContainer;
      },
      
      // Implement the required methods with proper typing
      async upsertRecord<T extends CosmosRecord>(
        record: T,
        containerName: string = 'default'
      ): Promise<T> {
        const { resource } = await mockItems.upsert<T>(record);
        return resource as T;
      },
      
      async query<T extends CosmosRecord>(
        query: string,
        parameters: { name: string; value: any }[] = [],
        containerName: string = 'default'
      ): Promise<T[]> {
        // For mock implementation, we'll just return all items
        const queryResult = await mockItems.query('SELECT * FROM c').fetchAll();
        return queryResult.resources as T[];
      },
      
      async getById<T extends CosmosRecord>(
        id: string,
        partitionKey: string,
        containerName: string = 'default'
      ): Promise<T | undefined> {
        try {
          const { resource } = await mockContainer.item(id, partitionKey).read<T>();
          return resource;
        } catch (error) {
          if ((error as { code?: number })?.code === 404) {
            return undefined;
          }
          throw error;
        }
      },
      
      async deleteRecord(
        id: string,
        partitionKey: string,
        containerName: string = 'default'
      ): Promise<void> {
        try {
          await mockContainer.item(id, partitionKey).delete();
        } catch (error) {
          if ((error as { code?: number })?.code !== 404) {
            throw error;
          }
        }
      }
    };

    cosmosDbInstance = mockCosmosDb;
    return mockCosmosDb;
  }

// Helper function to create CosmosDB client with proper typing
const createCosmosDbClient = async (): Promise<AzureCosmosDB> => {
  // Initialize Cosmos DB client
  let client: CosmosClient;
  
  // Use connection string if available
  if (process.env.AZURE_COSMOS_CONNECTION_STRING) {
    client = new CosmosClient(process.env.AZURE_COSMOS_CONNECTION_STRING);
  } else if (AZURE_CONFIG.cosmos.endpoint && AZURE_CONFIG.cosmos.key) {
    // Fall back to endpoint/key authentication
    client = new CosmosClient({
      endpoint: AZURE_CONFIG.cosmos.endpoint,
      key: AZURE_CONFIG.cosmos.key,
    });
  } else {
    throw new Error('Azure Cosmos DB configuration is missing');
  }

  // Initialize database and container
  const database = client.database(AZURE_CONFIG.cosmos.databaseName);
  const container = database.container(AZURE_CONFIG.cosmos.containerName);

  // Ensure container exists
  try {
    await container.read();
  } catch (error: unknown) {
    if ((error as { code?: number })?.code === 404) {
      throw new Error(`Container ${AZURE_CONFIG.cosmos.containerName} not found in database ${AZURE_CONFIG.cosmos.databaseName}`);
    }
    throw error;
  }

  // Define the database operation methods
  const dbMethods: Omit<AzureCosmosDB, 'cosmosClient' | 'database'> = {
    // Get a container with proper typing
    container: async <T extends CosmosRecord>(
      containerName: string,
      partitionKey: string
    ): Promise<Container> => {
      if (containerName !== AZURE_CONFIG.cosmos.containerName) {
        const containerResponse = await database.containers.createIfNotExists({
          id: containerName,
          partitionKey: {
            paths: [partitionKey]
          }
        });
        return containerResponse.container;
      }
      return container;
    },
    
    // Upsert a record with automatic ID generation if not provided
    async upsertRecord<T extends CosmosRecord>(
      record: T,
      containerName: string = AZURE_CONFIG.cosmos.containerName
    ): Promise<T> {
      const targetContainer = containerName === AZURE_CONFIG.cosmos.containerName 
        ? container 
        : database.container(containerName);
        
      // Ensure the record has an ID
      const recordWithId: T = {
        ...record,
        id: record.id || uuidv4(),
        // Add partition key if not present and different from id
        ...(AZURE_CONFIG.cosmos.partitionKey !== 'id' && !(AZURE_CONFIG.cosmos.partitionKey in record) 
          ? { [AZURE_CONFIG.cosmos.partitionKey]: (record as any)[AZURE_CONFIG.cosmos.partitionKey] || uuidv4() }
          : {})
      };
      
      // Upsert the record
      const { resource } = await targetContainer.items.upsert<T>(recordWithId);
      
      if (!resource) {
        throw new Error('Failed to upsert record');
      }
      
      // Strip Cosmos DB internal fields before returning
      const { _self, _etag, _ts, _rid, _attachments, ...result } = resource;
      return result as T;
    },

    // Query records with a SQL-like query
    async query<T extends CosmosRecord>(
      query: string, 
      parameters: { name: string; value: any }[] = [],
      containerName: string = AZURE_CONFIG.cosmos.containerName
    ): Promise<T[]> {
      const targetContainer = containerName === AZURE_CONFIG.cosmos.containerName 
        ? container 
        : database.container(containerName);
        
      // Execute the query and handle the response
      const response = await targetContainer.items.query<CosmosRecord>({
        query,
        parameters
      }).fetchAll();
      
      // Strip Cosmos DB internal fields before returning
      return response.resources.map(({ _self, _etag, _ts, _rid, _attachments, ...rest }) => rest as T);
    },
    
    // Get a record by ID
    async getById<T extends CosmosRecord>(
      id: string,
      partitionKey: string,
      containerName: string = AZURE_CONFIG.cosmos.containerName
    ): Promise<T | undefined> {
      const targetContainer = containerName === AZURE_CONFIG.cosmos.containerName 
        ? container 
        : database.container(containerName);
        
      try {
        const { resource } = await targetContainer.item(id, partitionKey).read<T>();
        if (!resource) return undefined;
        
        // Strip Cosmos DB internal fields before returning
        const { _self, _etag, _ts, _rid, _attachments, ...result } = resource;
        return result as T;
      } catch (error: unknown) {
        if ((error as { code?: number })?.code === 404) {
          return undefined;
        }
        throw error;
      }
    },
    
    // Delete a record by ID
    async deleteRecord(
      id: string,
      partitionKey: string,
      containerName: string = AZURE_CONFIG.cosmos.containerName
    ): Promise<void> {
      const targetContainer = containerName === AZURE_CONFIG.cosmos.containerName 
        ? container 
        : database.container(containerName);
        
      try {
        await targetContainer.item(id, partitionKey).delete();
      } catch (error: unknown) {
        if ((error as { code?: number })?.code !== 404) {
          throw error;
        }
      }
    }
  };

  // Create the AzureCosmosDB instance with proper typing
  const cosmosDb: AzureCosmosDB = {
    cosmosClient: client,
    database,
    container: dbMethods.container,
    upsertRecord: dbMethods.upsertRecord,
    query: dbMethods.query,
    getById: dbMethods.getById,
    deleteRecord: dbMethods.deleteRecord
  };
  
  return cosmosDb;
};

// Initialize the Cosmos DB client instance
let cosmosDbInstance: AzureCosmosDB | null = null;

export const initializeCosmosDB = async (): Promise<AzureCosmosDB> => {
  if (!cosmosDbInstance) {
    try {
      cosmosDbInstance = await createCosmosDbClient();
    } catch (error) {
      console.error('Failed to initialize Cosmos DB:', error);
      throw new Error('Failed to initialize Cosmos DB');
    }
  }
  return cosmosDbInstance;
};

/**
 * Initialize all Azure services
 */
export const initializeAzureServices = async (): Promise<{
  blobStorage: AzureBlobStorage;
  cosmosDb: AzureCosmosDB;
}> => {
  // Use mock implementations if configured
  if (useMockStorage || useMockCosmos) {
    console.log('Initializing mock Azure services');
    
    // Initialize mock Blob Storage if needed
    if (useMockStorage) {
      // @ts-ignore - Mock implementation
      blobServiceClient = initializeMockBlobStorage();
      containerName = process.env.AZURE_STORAGE_CONTAINER || 'excel-uploads';
      containerClient = blobServiceClient.getContainerClient(containerName);
      console.log('Using mock Blob Storage');
    }
    
    // Create mock blob storage instance
    const mockBlobStorage: AzureBlobStorage = {
      blobServiceClient: blobServiceClient || {},
      getContainerClient: (name: string) => 
        blobServiceClient?.getContainerClient?.(name) || {},
      uploadFile: async (containerName: string, file: Express.Multer.File) => {
        console.log(`[Mock] Uploading file to container ${containerName}: ${file.originalname}`);
        return {
          url: `https://mockstorage.blob.core.windows.net/${containerName}/${file.originalname}`,
          name: file.originalname,
          size: file.size
        };
      },
      deleteFile: async (containerName: string, fileName: string) => {
        console.log(`[Mock] Deleting file from container ${containerName}: ${fileName}`);
        return Promise.resolve();
      }
    };
    
    // Initialize Cosmos DB (or mock)
    let cosmosDb: AzureCosmosDB;
    
    if (useMockCosmos) {
      // @ts-ignore - Mock implementation
      cosmosClient = initializeMockCosmosDB();
      const databaseId = process.env.AZURE_COSMOS_DATABASE || 'excel-upload-db';
      const containerId = process.env.AZURE_COSMOS_CONTAINER || 'excel-records';
      // @ts-ignore - Mock implementation
      cosmosContainer = cosmosClient.database?.(databaseId)?.container?.(containerId);
      console.log('Using mock Cosmos DB');
      
      // Create mock Cosmos DB instance that matches the AzureCosmosDB interface
      const mockItems = new Map<string, any>();
      
      cosmosDb = {
        cosmosClient: {} as CosmosClient,
        database: {},
        
        container: async <T extends CosmosRecord>(
          containerName: string,
          partitionKey: string
        ): Promise<Container> => {
          return {} as Container;
        },
        
        upsertRecord: async <T extends CosmosRecord>(
          record: T,
          containerName?: string
        ): Promise<T> => {
          const id = record.id || uuidv4();
          const item = { ...record, id };
          mockItems.set(id, item);
          return item;
        },
        
        query: async <T extends CosmosRecord>(
          query: string,
          parameters: { name: string; value: any }[] = [],
          containerName?: string
        ): Promise<T[]> => {
          return Array.from(mockItems.values()) as T[];
        },
        
        getById: async <T extends CosmosRecord>(
          id: string,
          partitionKey: string,
          containerName?: string
        ): Promise<T | undefined> => {
          return mockItems.get(id) as T | undefined;
        },
        
        deleteRecord: async (
          id: string,
          partitionKey: string,
          containerName?: string
        ): Promise<void> => {
          mockItems.delete(id);
        }
      };
    } else {
      cosmosDb = await initializeCosmosDB();
    }
    
    return { 
      blobStorage: useMockStorage ? mockBlobStorage : await initializeBlobStorageAsync(),
      cosmosDb 
    };
  }
  
  // Use real implementations if not using mocks
  try {
    const [blobStorage, cosmosDb] = await Promise.all([
      initializeBlobStorageAsync(),
      initializeCosmosDB(),
    ]);
    
    return { blobStorage, cosmosDb };
  } catch (error) {
    console.error('Failed to initialize Azure services:', error);
    throw new Error('Failed to initialize Azure services');
  }
};

// Re-export types for convenience
export type { ContainerClient } from '@azure/storage-blob';
export type { Database, Container } from '@azure/cosmos';
