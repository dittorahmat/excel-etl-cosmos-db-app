import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import type { AzureBlobStorage, MulterFile } from '../../types/azure.js';

export interface BlobStorageConfig {
  connectionString: string;
  containerName: string;
}

class BlobStorageService {
  private blobServiceClient: BlobServiceClient | null = null;
  private containerClient: ContainerClient | null = null;
  private isInitialized = false;

  /**
   * Initialize Azure Blob Storage client
   * @param config - Configuration object with connection string and container name
   */
  public initialize(config: BlobStorageConfig): void {
    if (this.isInitialized) return;

    const { connectionString, containerName } = config;
    
    if (!connectionString) {
      throw new Error('Azure Storage connection string is not configured');
    }

    if (!containerName) {
      throw new Error('Azure Storage container name is not configured');
    }

    this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    this.containerClient = this.blobServiceClient.getContainerClient(containerName);
    this.isInitialized = true;
  }

  /**
   * Get the container client, ensuring the service is initialized
   * @throws Error if the service is not initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized || !this.blobServiceClient || !this.containerClient) {
      throw new Error('Blob Storage service is not initialized. Call initialize() first.');
    }
  }

  /**
   * Get the container client
   * @throws Error if the service is not initialized
   */
  public getContainerClient(): ContainerClient {
    this.ensureInitialized();
    return this.containerClient!;
  }

  /**
   * Get the blob service client
   * @throws Error if the service is not initialized
   */
  public getBlobServiceClient(): BlobServiceClient {
    this.ensureInitialized();
    return this.blobServiceClient!;
  }
}

// Export a singleton instance
export const blobStorageService = new BlobStorageService();

// Legacy export for backward compatibility
export function initializeBlobStorage(config?: BlobStorageConfig): void {
  if (!config) {
    config = {
      connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING || '',
      containerName: process.env.AZURE_STORAGE_CONTAINER_NAME || ''
    };
  }
  blobStorageService.initialize(config);
}

// Legacy exports for backward compatibility
export let blobServiceClient: BlobServiceClient | null = null;
export let containerClient: ContainerClient | null = null;

/**
 * Initialize Azure Blob Storage client asynchronously
 * @param config - Configuration object with connection string and container name
 * @returns Promise that resolves to the initialized AzureBlobStorage instance
 */
export async function initializeBlobStorageAsync(config?: BlobStorageConfig): Promise<AzureBlobStorage> {
  if (!config) {
    config = {
      connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING || '',
      containerName: process.env.AZURE_STORAGE_CONTAINER_NAME || ''
    };
  }
  
  const { connectionString, containerName } = config;
  
  console.log('Initializing Blob Storage...');
  console.log('Storage connection string:', connectionString ? '***' : 'Not set');
  console.log('Container name:', containerName);
  
  // Initialize the service
  blobStorageService.initialize(config);
  
  try {
    const containerClient = blobStorageService.getContainerClient();
    
    console.log('Creating container if it does not exist...');
    await containerClient.createIfNotExists();
    console.log('Container ready');
    
    return {
      uploadFile: async (file: MulterFile, blobName: string): Promise<string> => {
        const container = blobStorageService.getContainerClient();
        const blockBlobClient = container.getBlockBlobClient(blobName);
        await blockBlobClient.uploadData(file.buffer, {
          blobHTTPHeaders: { blobContentType: file.mimetype },
        });
        
        return blockBlobClient.url;
      },
      
      deleteFile: async (blobName: string): Promise<boolean> => {
        const container = blobStorageService.getContainerClient();
        const blockBlobClient = container.getBlockBlobClient(blobName);
        const response = await blockBlobClient.deleteIfExists();
        return response.succeeded;
      },
      
      getFileUrl: (blobName: string): string => {
        const container = blobStorageService.getContainerClient();
        return container.getBlockBlobClient(blobName).url;
      },
      
      getContainerName: (): string => {
        return blobStorageService.getContainerClient().containerName;
      },
    };
  } catch (error) {
    console.error('Error initializing Blob Storage:', error);
    throw error;
  }
}

/**
 * Get or initialize the Azure Blob Storage client
 * @returns Promise that resolves to the initialized AzureBlobStorage instance
 */
export async function getOrInitializeBlobStorage(): Promise<AzureBlobStorage> {
  return initializeBlobStorageAsync();
}
