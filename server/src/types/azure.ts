import type { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import type { 
  CosmosClient, 
  Container, 
  SqlQuerySpec,
  
  Database
} from '@azure/cosmos';
// Mock types are now defined locally


// Express Multer File type
export interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}


// Base type for all Cosmos DB records
export type CosmosRecord = Record<string, unknown> & {
  id: string;
};

/**
 * Interface for interacting with Azure Blob Storage
 */
export interface AzureBlobStorage {
  blobServiceClient: BlobServiceClient;
  getContainerClient: (containerName: string) => ContainerClient;
  uploadFile: (
    containerName: string,
    file: MulterFile
  ) => Promise<{
    url: string;
    name: string;
    size: number;
  }>;
  deleteFile: (containerName: string, fileName: string) => Promise<void>;
}

/**
 * Interface for interacting with Azure Cosmos DB
 */
export interface AzureCosmosDB {
  /** The underlying CosmosClient instance */
  cosmosClient: CosmosClient;

  /** The Cosmos DB database instance */
  database: Database;

  /**
   * Get a reference to a Cosmos DB container
   * @param containerName - The name of the container
   * @param partitionKey - The partition key path
   */
  container: (
    containerName: string,
    partitionKey: string
  ) => Promise<Container>;

  /**
   * Upsert a record into Cosmos DB
   * @param record - The record to upsert
   * @param containerName - Optional container name (defaults to configured container)
   */
  upsertRecord: <T extends CosmosRecord>(
    record: T,
    containerName?: string
  ) => Promise<T>;

  /**
   * Query records from Cosmos DB
   * @param query - The SQL query
   * @param parameters - Query parameters
   * @param containerName - Optional container name (defaults to configured container)
   */
  query: <T extends CosmosRecord>(
    query: string,
    parameters?: { name: string; value: unknown }[],
    containerName?: string
  ) => Promise<T[]>;

  /**
   * Get a record by ID
   * @param id - The record ID
   * @param partitionKey - The partition key value
   * @param containerName - Optional container name (defaults to configured container)
   */
  getById: <T extends CosmosRecord>(
    id: string,
    partitionKey: string,
    containerName?: string
  ) => Promise<T | undefined>;

  /**
   * Delete a record by ID
   * @param id - The record ID
   * @param partitionKey - The partition key value
   * @param containerName - Optional container name (defaults to configured container)
   */
  deleteRecord: (
    id: string,
    partitionKey: string,
    containerName?: string
  ) => Promise<void>;
}

// Mock implementation types
export interface MockBlobStorage extends AzureBlobStorage {
  _mocks: {
    upload: (containerName: string, file: MulterFile) => Promise<{ url: string; name: string; size: number; }>;
    delete: (containerName: string, fileName: string) => Promise<void>;
  };
}

export interface MockCosmosDB extends AzureCosmosDB {
  _mocks: {
    upsert: <T extends CosmosRecord>(
      record: T, 
      containerName?: string
    ) => Promise<T>;
    query: <T extends CosmosRecord>(
      query: string | SqlQuerySpec, 
      parameters?: Array<{ name: string; value: unknown }>, 
      containerName?: string
    ) => Promise<T[]>;
    getById: <T extends CosmosRecord>(
      id: string, 
      partitionKey: string, 
      containerName?: string
    ) => Promise<T | undefined>;
    delete: (
      id: string, 
      partitionKey: string, 
      containerName?: string
    ) => Promise<boolean>;
  };
  
  // Database operations
  database: Database;
  
  // Container operations
  container: (containerName: string, partitionKey?: string) => Promise<Container>;
  
  // Document operations
  upsert: <T extends CosmosRecord>(
    record: T, 
    containerName?: string
  ) => Promise<T>;
  
  query: <T extends CosmosRecord>(
    query: string | SqlQuerySpec, 
    parameters?: Array<{ name: string; value: unknown }>, 
    containerName?: string
  ) => Promise<T[]>;
  
  getById: <T extends CosmosRecord>(
    id: string, 
    partitionKey: string, 
    containerName?: string
  ) => Promise<T | undefined>;
  
  delete: (
    id: string, 
    partitionKey: string, 
    containerName?: string
  ) => Promise<boolean>;
  
  // Add any other methods that are used in the mock implementation
  [key: string]: unknown;
}
