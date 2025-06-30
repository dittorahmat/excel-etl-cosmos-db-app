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
  console.log('Initializing Blob Storage...');
  console.log('Storage connection string:', AZURE_CONFIG.storage.connectionString ? '***' : 'Not set');
  console.log('Container name:', AZURE_CONFIG.storage.containerName);
  
  if (!blobServiceClient) {
    const connectionString = AZURE_CONFIG.storage.connectionString;
    
    if (!connectionString) {
      console.error('Azure Storage connection string is not configured');
      throw new Error('Azure Storage connection string is not configured');
    }

    try {
      console.log('Creating BlobServiceClient...');
      blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
      console.log('BlobServiceClient created successfully');
      
      containerClient = blobServiceClient.getContainerClient(AZURE_CONFIG.storage.containerName);
      console.log('Container client created for container:', AZURE_CONFIG.storage.containerName);
      
      // Create container if it doesn't exist
      console.log('Creating container if it does not exist...');
      const createContainerResponse = await containerClient.createIfNotExists();
      console.log('Container operation result:', createContainerResponse.succeeded ? 'Success' : 'Failed');
      
      if (!createContainerResponse.succeeded) {
        console.warn('Container may already exist or there was an issue creating it');
      }
    } catch (error) {
      console.error('Error initializing Blob Storage:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
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
