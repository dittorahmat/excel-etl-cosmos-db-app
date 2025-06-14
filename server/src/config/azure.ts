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
}

// Base type for all Cosmos DB records
export type CosmosRecord = Record<string, unknown> & {
  id: string;
};

export interface AzureCosmosDB {
  cosmosClient: CosmosClient;
  database: any;
  container: any;
  
  // Upsert a record with automatic ID generation if not provided
  upsertRecord: <T extends CosmosRecord>(record: T) => Promise<T>;
  
  // Get a record by ID
  getRecord: <T extends CosmosRecord>(id: string) => Promise<T | undefined>;
  
  // Query records with a SQL-like query
  queryRecords: <T extends CosmosRecord>(
    query: string, 
    parameters?: any[]
  ) => Promise<T[]>;
}

// Service instances
let blobStorageInstance: AzureBlobStorage | null = null;
let cosmosDbInstance: AzureCosmosDB | null = null;

// Azure Blob Storage clients
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
  console.log('Initializing mock Cosmos DB client');
  
  return {
    database: (id: string) => ({
      container: (containerId: string) => ({
        items: {
          query: async (querySpec: any) => {
            // Mock query implementation
            return { resources: Array.from(mockCosmosData.values()) };
          },
          create: async (data: any) => {
            const id = data.id || uuidv4();
            const item = { ...data, id };
            mockCosmosData.set(id, item);
            return { resource: item };
          },
          upsert: async (data: any) => {
            const id = data.id || uuidv4();
            const item = { ...data, id };
            mockCosmosData.set(id, item);
            return { resource: item };
          },
          item: (id: string) => ({
            read: async () => ({
              resource: mockCosmosData.get(id) || null
            }),
            replace: async (data: any) => {
              mockCosmosData.set(id, data);
              return { resource: data };
            },
            delete: async () => {
              mockCosmosData.delete(id);
              return { statusCode: 204 };
            }
          })
        }
      })
    })
  };
};

// Initialize mock storage for development
const initializeMockBlobStorage = () => {
  console.log('Initializing mock Blob Storage');
  
  return {
    getContainerClient: (containerName: string) => ({
      getBlockBlobClient: (blobName: string) => ({
        upload: async (data: any, contentLength: number, options: any) => {
          console.log(`[Mock Storage] Uploading ${blobName} (${contentLength} bytes)`);
          return {
            requestId: `mock-${Date.now()}`,
            clientRequestId: options.blobHTTPHeaders?.blobContentType || '',
            version: '1.0',
            date: new Date(),
            errorCode: undefined,
            'content-md5': '',
            'last-modified': new Date(),
            'x-ms-request-id': `mock-${Date.now()}`,
            'x-ms-version': '2021-06-08',
            'x-ms-request-server-encrypted': true,
          };
        },
        download: async () => ({
          readableStreamBody: require('stream').Readable.from('mock file content'),
          contentLength: 0,
          _response: {
            status: 200,
            parsedHeaders: {},
            request: {},
            headers: {},
          },
        }),
        delete: async () => ({
          _response: {
            status: 204,
            parsedHeaders: {},
            request: {},
            headers: {},
          },
        }),
      }),
    }),
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
    
    const mockItems = {
      upsert: async <T extends CosmosRecord>(record: T) => {
        const id = record.id || 'test-id';
        mockDb[id] = { ...record, id };
        return { resource: mockDb[id] };
      },
      query: () => ({
        fetchAll: async () => ({
          resources: Object.values(mockDb)
        })
      }),
      read: async () => ({
        resource: { id: 'test-id', name: 'test-record' }
      })
    };

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
      database: {
        container: () => mockContainer,
      } as unknown as any,
      container: mockContainer,
      
      // Implement the required methods with proper typing
      async upsertRecord<T extends CosmosRecord>(record: T): Promise<T> {
        const { resource } = await mockItems.upsert<T>(record);
        return resource as T;
      },
      
      async getRecord<T extends CosmosRecord>(id: string): Promise<T | undefined> {
        try {
          const { resource } = await mockContainer.item(id, id).read<CosmosRecord>();
          return resource as T;
        } catch (error) {
          if ((error as { code?: number })?.code === 404) {
            return undefined;
          }
          throw error;
        }
      },
      
      async queryRecords<T extends CosmosRecord>(query: string, parameters: any[] = []): Promise<T[]> {
        const queryResult = await mockItems.query().fetchAll();
        return queryResult.resources as T[];
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
    const dbMethods = {
      // Upsert a record with automatic ID generation if not provided
      async upsertRecord<T extends CosmosRecord>(record: T): Promise<T> {
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
        const { resource } = await container.items.upsert(recordWithId);
        
        if (!resource) {
          throw new Error('Failed to upsert record');
        }
        
        // Strip Cosmos DB internal fields before returning
        const { _self, _etag, _ts, _rid, _attachments, ...result } = resource;
        return result as T;
      },

      // Get a record by ID
      async getRecord<T extends CosmosRecord>(id: string): Promise<T | undefined> {
        try {
          const { resource } = await container.item(id, id).read<CosmosRecord>();
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

      // Query records with a SQL-like query
      async queryRecords<T extends CosmosRecord>(query: string, parameters: any[] = []): Promise<T[]> {
        // Execute the query and handle the response
        const response = await container.items.query<CosmosRecord>({
          query,
          parameters: parameters.map((value, index) => ({
            name: `@param${index}`,
            value
          }))
        }).fetchAll();
        
        // Strip Cosmos DB internal fields before returning
        return response.resources.map(({ _self, _etag, _ts, _rid, _attachments, ...rest }) => rest as T);
      }
    };

    // Return the complete AzureCosmosDB instance
    return {
      cosmosClient: client,
      database,
      container,
      ...dbMethods
    };
  };

  try {
    const instance = await createCosmosDbClient();
    cosmosDbInstance = instance;
    return instance;
  } catch (error) {
    console.error('Failed to initialize Cosmos DB:', error);
    throw new Error('Failed to initialize Cosmos DB');
  }
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
      
      // Create mock Cosmos DB instance
      cosmosDb = {
        cosmosClient: cosmosClient || {},
        database: cosmosClient?.database?.(databaseId) || {},
        container: cosmosContainer || {},
        
        upsertRecord: async <T extends CosmosRecord>(record: T): Promise<T> => {
          const id = record.id || uuidv4();
          const item = { ...record, id };
          mockCosmosData.set(id, item);
          return item;
        },
        
        getRecord: async <T extends CosmosRecord>(id: string): Promise<T | undefined> => {
          return mockCosmosData.get(id) as T | undefined;
        },
        
        queryRecords: async <T extends CosmosRecord>(
          query: string, 
          parameters: any[] = []
        ): Promise<T[]> => {
          // Simple mock implementation - in a real app, you'd parse the query
          return Array.from(mockCosmosData.values()) as T[];
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
