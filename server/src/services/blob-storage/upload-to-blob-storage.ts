import { 
  BlobServiceClient, 
  StorageSharedKeyCredential,
  BlobSASPermissions,
  generateBlobSASQueryParameters,
  BlobSASSignatureValues
} from '@azure/storage-blob';
import { AZURE_CONFIG } from '../../config/azure-config.js';
import { logger } from '../../utils/logger.js';

let blobServiceClient: BlobServiceClient | null = null;
let accountName: string = '';
let accountKey: string = '';

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
      
      // Extract account name and key from connection string
      const matches = connectionString.match(/AccountName=([^;]+);AccountKey=([^;]+)/i);
      if (!matches) {
        throw new Error('Invalid Azure Storage connection string format');
      }
      
      accountName = matches[1];
      accountKey = matches[2];
      
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

    // Generate SAS token that's valid for 1 hour
    const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
    const sasToken = generateBlobSASQueryParameters(
      {
        containerName: containerClient.containerName,
        blobName: sanitizedFileName,
        permissions: BlobSASPermissions.parse("r"), // Read-only
        startsOn: new Date(),
        expiresOn: new Date(new Date().valueOf() + 3600 * 1000), // 1 hour from now
      },
      sharedKeyCredential
    ).toString();

    const sasUrl = `${blockBlobClient.url}?${sasToken}`;
    
    logger.info('File uploaded successfully', {
      fileName: sanitizedFileName,
      requestId: uploadResponse.requestId,
      url: sasUrl // Return SAS URL instead of direct URL
    });

    return sasUrl;
  } catch (error) {
    logger.error('Error uploading file to blob storage', {
      fileName,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw new Error(`Failed to upload file to blob storage: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
