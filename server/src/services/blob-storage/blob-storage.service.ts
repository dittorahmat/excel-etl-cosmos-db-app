import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import { AZURE_CONFIG } from '../../config/azure-config.js';
import type { AzureBlobStorage, MulterFile } from '../../types/azure.js';

let blobServiceClient: BlobServiceClient | null = null;
let containerClient: ContainerClient | null = null;

/**
 * Initialize Azure Blob Storage client
 */
export function initializeBlobStorage(): void {
  if (blobServiceClient) return;

  const connectionString = AZURE_CONFIG.storage.connectionString;
  
  if (!connectionString) {
    throw new Error('Azure Storage connection string is not configured');
  }

  blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  containerClient = blobServiceClient.getContainerClient(AZURE_CONFIG.storage.containerName);
}

/**
 * Initialize Azure Blob Storage client asynchronously
 * @returns Promise that resolves to the initialized AzureBlobStorage instance
 */
export async function initializeBlobStorageAsync(): Promise<AzureBlobStorage> {
  if (!blobServiceClient) {
    const connectionString = AZURE_CONFIG.storage.connectionString;
    
    if (!connectionString) {
      throw new Error('Azure Storage connection string is not configured');
    }

    blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    containerClient = blobServiceClient.getContainerClient(AZURE_CONFIG.storage.containerName);
    
    // Create container if it doesn't exist
    try {
      await containerClient.createIfNotExists();
    } catch (error) {
      console.error('Error creating container:', error);
      throw error;
    }
  }

  return {
    blobServiceClient,
    getContainerClient: (containerName: string) => {
      return blobServiceClient!.getContainerClient(containerName);
    },
    uploadFile: async (containerName: string, file: MulterFile) => {
      const containerClient = blobServiceClient!.getContainerClient(containerName);
      const blobName = `${Date.now()}-${file.originalname}`;
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      
      await blockBlobClient.uploadData(file.buffer, {
        blobHTTPHeaders: { blobContentType: file.mimetype },
      });

      return {
        url: blockBlobClient.url,
        name: blobName,
        size: file.size,
      };
    },
    deleteFile: async (containerName: string, fileName: string) => {
      const containerClient = blobServiceClient!.getContainerClient(containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(fileName);
      await blockBlobClient.deleteIfExists();
    },
  };
}

/**
 * Get or initialize the Azure Blob Storage client
 * @returns Promise that resolves to the initialized AzureBlobStorage instance
 */
export async function getOrInitializeBlobStorage(): Promise<AzureBlobStorage> {
  if (!blobServiceClient) {
    return initializeBlobStorageAsync();
  }
  
  return {
    blobServiceClient,
    getContainerClient: (containerName: string) => blobServiceClient!.getContainerClient(containerName),
    uploadFile: async (containerName: string, file: MulterFile) => {
      const containerClient = blobServiceClient!.getContainerClient(containerName);
      const blobName = `${Date.now()}-${file.originalname}`;
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      
      await blockBlobClient.uploadData(file.buffer, {
        blobHTTPHeaders: { blobContentType: file.mimetype },
      });

      return {
        url: blockBlobClient.url,
        name: blobName,
        size: file.size,
      };
    },
    deleteFile: async (containerName: string, fileName: string) => {
      const containerClient = blobServiceClient!.getContainerClient(containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(fileName);
      await blockBlobClient.deleteIfExists();
    },
  };
}
