// Import types from @azure/cosmos for local use
import type { 
  Container as AzureContainer, 
  CosmosClient as AzureCosmosClient,
  SqlQuerySpec as AzureSqlQuerySpec,
  ItemResponse as AzureItemResponse,
  Database as AzureDatabase,
  Resource 
} from '@azure/cosmos';

// Re-export the types for external use
export type { 
  AzureContainer as Container, 
  AzureCosmosClient as CosmosClient,
  AzureSqlQuerySpec as SqlQuerySpec,
  AzureItemResponse as ItemResponse,
  AzureDatabase as Database
};

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
export interface CosmosRecord extends Partial<Resource> {
  id: string;
  _partitionKey?: string;
  documentType?: string;
  userId?: string;
  [key: string]: unknown;
}

/**
 * Interface for interacting with Azure Blob Storage
 */
export interface AzureBlobStorage {
  uploadFile: (file: MulterFile, blobName: string) => Promise<string>;
  deleteFile: (blobName: string) => Promise<boolean>;
  getFileUrl: (blobName: string) => string;
  getContainerName: () => string;
}

/**
 * Interface for interacting with Azure Cosmos DB
 */
export interface AzureCosmosDB {
  /** The underlying CosmosClient instance */
  cosmosClient: AzureCosmosClient;

  /** The Cosmos DB database instance */
  database: AzureDatabase;

  /**
   * Get a reference to a Cosmos DB container
   * @param containerName - The name of the container
   * @param partitionKey - The partition key path
   */
  container: (
    containerName: string,
    partitionKey: string
  ) => Promise<AzureContainer>;

  /**
   * Upsert a record into Cosmos DB
   * @param record - The record to upsert
   * @param containerName - Optional container name (defaults to configured container)
   */
  upsertRecord: <T extends CosmosRecord>(
    record: T,
    containerName?: string
  ) => Promise<AzureItemResponse<T>>;

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
export interface MockBlobStorage {
  _mocks: {
    upload: (file: MulterFile, blobName: string) => Promise<string>;
    delete: (blobName: string) => Promise<boolean>;
  };
  upload: (file: MulterFile, blobName: string) => Promise<string>;
  delete: (blobName: string) => Promise<boolean>;
  getFileUrl: (blobName: string) => string;
  getContainerName: () => string;
}

export interface MockCosmosDB extends AzureCosmosDB {
  _mocks: {
    upsert: <T extends CosmosRecord>(
      record: T, 
      containerName?: string
    ) => Promise<AzureItemResponse<T>>;
    query: <T extends CosmosRecord>(
      query: string | AzureSqlQuerySpec, 
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
  database: AzureDatabase;
  
  // Container operations
  container: (containerName: string, partitionKey?: string) => Promise<AzureContainer>;
  
  // Document operations
  upsert: <T extends CosmosRecord>(
    record: T, 
    containerName?: string
  ) => Promise<AzureItemResponse<T>>;
  
  query: <T extends CosmosRecord>(
    query: string | AzureSqlQuerySpec, 
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
