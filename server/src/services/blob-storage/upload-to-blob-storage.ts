import { BlobServiceClient } from '@azure/storage-blob';
import { AZURE_CONFIG } from '../../config/azure-config.js';
import { logger } from '../../utils/logger.js';

let blobServiceClient: BlobServiceClient | null = null;

/**
 * Upload a file to Azure Blob Storage
 * @param buffer - File buffer to upload
 * @param fileName - Name to give the uploaded file
 * @param contentType - MIME type of the file (default: 'application/octet-stream')
 * @returns Promise that resolves to the URL of the uploaded file
 */
export async function uploadToBlobStorage(
  buffer: Buffer,
  fileName: string,
  contentType: string = 'application/octet-stream'
): Promise<string> {
  try {
    if (!blobServiceClient) {
      const connectionString = AZURE_CONFIG.storage.connectionString;
      
      if (!connectionString) {
        throw new Error('Azure Storage connection string is not configured');
      }
      
      blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    }

    const containerClient = blobServiceClient.getContainerClient(AZURE_CONFIG.storage.containerName);
    
    // Sanitize the file name to remove any path information
    const sanitizedFileName = fileName.split('/').pop() || fileName;
    
    // Create a block blob client
    const blockBlobClient = containerClient.getBlockBlobClient(sanitizedFileName);
    
    logger.info('Uploading file to blob storage', {
      fileName: sanitizedFileName,
      contentType,
      size: buffer.length,
      container: containerClient.containerName
    });

    // Upload the file
    const uploadResponse = await blockBlobClient.uploadData(buffer, {
      blobHTTPHeaders: { blobContentType: contentType },
    });

    logger.info('File uploaded successfully', {
      fileName: sanitizedFileName,
      requestId: uploadResponse.requestId,
      url: blockBlobClient.url
    });

    return blockBlobClient.url;
  } catch (error) {
    logger.error('Error uploading file to blob storage', {
      fileName,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw new Error(`Failed to upload file to blob storage: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
