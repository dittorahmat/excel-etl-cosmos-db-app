import { 
  BlobServiceClient, 
  StorageSharedKeyCredential,
  BlobSASPermissions,
  generateBlobSASQueryParameters,
  BlobUploadCommonResponse
} from '@azure/storage-blob';
import { AZURE_CONFIG } from '../../config/azure-config.js';
import { logger } from '../../utils/logger.js';

interface AzureError extends Error {
  code?: string;
  statusCode?: number;
  statusMessage?: string;
  details?: Record<string, unknown>;
  originalError?: unknown;
}

interface UploadResponse extends BlobUploadCommonResponse {
  clientRequestId?: string;
  version?: string;
  blobCommittedBlockCount?: number;
  contentMD5?: Uint8Array;
}

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
  const requestId = `blob_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  
  logger.info('Starting blob storage upload', {
    requestId,
    fileName,
    contentType,
    bufferLength: buffer.length,
    timestamp: new Date().toISOString()
  });
  try {
    const connectionString = AZURE_CONFIG.storage.connectionString;
    
    if (!blobServiceClient) {
      if (!connectionString) {
        const error = new Error('Azure Storage connection string is not configured');
        logger.error('Azure Storage configuration error', {
          requestId,
          error: error.message,
          config: {
            hasConnectionString: !!connectionString,
            connectionStringPrefix: connectionString ? connectionString.substring(0, 20) + '...' : 'undefined',
            containerName: AZURE_CONFIG.storage.containerName
          }
        });
        throw error;
      }
      
      // Extract account name and key from connection string
      const matches = connectionString.match(/AccountName=([^;]+);AccountKey=([^;]+)/i);
      if (!matches) {
        const error = new Error('Invalid Azure Storage connection string format');
        logger.error('Azure Storage connection string format error', {
          requestId,
          error: error.message,
          connectionStringPreview: connectionString ? 
            `${connectionString.substring(0, 10)}...${connectionString.substring(-10)}` : 'undefined'
        });
        throw error;
      }
      
      accountName = matches[1];
      accountKey = matches[2];
      
      blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    }

    const containerName = AZURE_CONFIG.storage.containerName;
    // Extract account name and key from connection string if not already done
    if (!accountName || !accountKey) {
      const accountMatches = connectionString.match(/AccountName=([^;]+);AccountKey=([^;]+)/i);
      if (accountMatches) {
        accountName = accountMatches[1];
        accountKey = accountMatches[2];
      }
    }
    
    if (!containerName) {
      const error = new Error('Azure Storage container name is not configured');
      logger.error('Azure Storage configuration error', {
        requestId,
        error: error.message,
        config: {
          containerName,
          connectionStringConfigured: !!connectionString,
          accountName
        }
      });
      throw error;
    }
    
    logger.debug('Getting container client', {
      requestId,
      containerName,
      accountName
    });
    
    const containerClient = blobServiceClient.getContainerClient(containerName);
    
    // Sanitize the file name to remove any path information
    const sanitizedFileName = fileName.split('/').pop() || fileName;
    
    logger.debug('Sanitized file name', {
      requestId,
      originalFileName: fileName,
      sanitizedFileName
    });
    
    // Create a block blob client
    const blockBlobClient = containerClient.getBlockBlobClient(sanitizedFileName);
    
    logger.info('Uploading file to blob storage', {
      fileName: sanitizedFileName,
      contentType,
      size: buffer.length,
      container: containerClient.containerName
    });

    // Upload the file
    logger.debug('Starting file upload to blob storage', {
      requestId,
      fileName: sanitizedFileName,
      contentType,
      bufferLength: buffer.length,
      containerName
    });
    
    let uploadResponse: UploadResponse;
    try {
      uploadResponse = await blockBlobClient.uploadData(buffer, {
        blobHTTPHeaders: { blobContentType: contentType },
      }) as UploadResponse;
      
      logger.debug('File upload successful', {
        requestId,
        fileName: sanitizedFileName,
        uploadRequestId: uploadResponse.requestId,
        clientRequestId: uploadResponse.clientRequestId,
        version: uploadResponse.version,
        contentMD5: uploadResponse.contentMD5 ? Buffer.from(uploadResponse.contentMD5).toString('base64') : undefined
      });
    } catch (uploadError) {
      const error = uploadError as AzureError;
      logger.error('File upload failed', {
        requestId,
        fileName: sanitizedFileName,
        error: error.message || 'Unknown error',
        stack: error.stack,
        containerName,
        accountName,
        errorCode: error.code,
        statusCode: error.statusCode,
        statusMessage: error.statusMessage,
        details: error.details
      });
      throw new Error(`Failed to upload file to blob storage: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`);
    }

    // Generate SAS token that's valid for 1 hour
    let sasToken;
    try {
      const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
      const sasOptions = {
        containerName: containerClient.containerName,
        blobName: sanitizedFileName,
        permissions: BlobSASPermissions.parse("r"), // Read-only
        startsOn: new Date(),
        expiresOn: new Date(new Date().valueOf() + 3600 * 1000), // 1 hour from now
      };
      
      logger.debug('Generating SAS token', {
        requestId,
        ...sasOptions,
        accountName: accountName // Log account name without key for security
      });
      
      sasToken = generateBlobSASQueryParameters(
        sasOptions,
        sharedKeyCredential
      ).toString();
      
      logger.debug('SAS token generated successfully', {
        requestId,
        sasTokenPreview: sasToken ? `${sasToken.substring(0, 10)}...` : 'undefined'
      });
    } catch (sasError) {
      logger.error('Failed to generate SAS token', {
        requestId,
        error: sasError instanceof Error ? sasError.message : 'Unknown error',
        stack: sasError instanceof Error ? sasError.stack : undefined,
        fileName: sanitizedFileName,
        containerName: containerClient.containerName
      });
      // Still continue with the direct URL if SAS fails
      sasToken = '';
    }

    const sasUrl = sasToken ? `${blockBlobClient.url}?${sasToken}` : blockBlobClient.url;
    
    logger.info('File upload completed successfully', {
      requestId,
      fileName: sanitizedFileName,
      uploadRequestId: uploadResponse.requestId,
      hasSasToken: !!sasToken,
      urlLength: sasUrl.length,
      urlPreview: sasUrl ? `${sasUrl.substring(0, 50)}...` : 'undefined',
      timestamp: new Date().toISOString()
    });

    return sasUrl;
  } catch (error) {
    const azureError = error as AzureError;
    logger.error('Error in uploadToBlobStorage', {
      requestId: requestId || 'unknown',
      fileName,
      error: azureError.message || 'Unknown error',
      stack: azureError.stack,
      errorDetails: {
        name: azureError.name,
        message: azureError.message,
        code: azureError.code,
        statusCode: azureError.statusCode,
        statusMessage: azureError.statusMessage,
        ...(azureError.details || {})
      },
      timestamp: new Date().toISOString()
    });
    
    // Re-throw with more context if possible
    const errorMessage = azureError.message || 'Unknown error';
    const errorCode = azureError.code || 'UPLOAD_ERROR';
    const statusCode = azureError.statusCode || 500;
    
    const enhancedError = new Error(`Failed to upload file to blob storage: ${errorMessage}`) as AzureError;
    enhancedError.code = errorCode;
    enhancedError.statusCode = statusCode;
    enhancedError.originalError = error;
    
    throw enhancedError;
  }
}
