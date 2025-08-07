import { Request, Response } from 'express';

// Extend the Express Request type to include our custom properties
declare module 'express-serve-static-core' {
  interface Request {
    id?: string;
    [key: string]: unknown;
  }
}
import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import { logger } from '../../../../utils/logger.js';
import { AZURE_CONFIG } from '../../../../config/azure-config.js';
import { AzureCosmosDB } from '../../../../types/azure.js';

// Initialize Blob Service Client with error handling
let blobServiceClient: BlobServiceClient | undefined;
let containerClient: ContainerClient | undefined;

/**
 * Initialize Azure Blob Storage client
 * @returns Promise that resolves when initialization is complete
 */
async function initializeBlobStorage() {
  try {
    const { connectionString, containerName } = AZURE_CONFIG.storage;
    
    logger.info('Initializing Azure Blob Storage client', {
      hasConnectionString: !!connectionString,
      containerName,
      connectionStringPreview: connectionString ? `${connectionString.substring(0, 20)}...` : 'undefined'
    });

    if (!connectionString) {
      throw new Error('Azure Storage connection string is not configured');
    }
    
    if (!containerName) {
      throw new Error('Azure Storage container name is not configured');
    }
    
    // Initialize the BlobServiceClient
    blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    containerClient = blobServiceClient.getContainerClient(containerName);
    
    // Test the connection
    const exists = await containerClient.exists();
    logger.info(`Azure Blob Storage container '${containerName}' ${exists ? 'exists' : 'does not exist'}`);
    
    if (!exists) {
      logger.warn(`Container '${containerName}' does not exist in the storage account`);
    }
    
    return { blobServiceClient, containerClient };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to initialize Azure Blob Storage client', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Re-throw with more context
    const initError = new Error(`Azure Blob Storage initialization failed: ${errorMessage}`);
    (initError as Error & { originalError?: unknown }).originalError = error;
    throw initError;
  }
}

// Initialize on module load
initializeBlobStorage().catch(error => {
  logger.error('Error during Azure Blob Storage initialization', {
    error: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined
  });
  // Don't throw here to allow the app to start, but the first request will fail
});

interface ImportMetadata {
  id: string;
  fileName: string;
  blobUrl?: string;
  fileType?: string;
}

export class DownloadImportHandler {
  private cosmosDb: AzureCosmosDB;

  constructor(cosmosDb: AzureCosmosDB) {
    this.cosmosDb = cosmosDb;
  }

  async handle(req: Request, res: Response): Promise<Response | void> {
    const requestId = req.id || 'unknown';
    
    // Ensure Blob Storage is initialized
    if (!blobServiceClient || !containerClient) {
      try {
        logger.warn('Blob Storage client not initialized, attempting to initialize...', { requestId });
        await initializeBlobStorage();
        
        if (!blobServiceClient || !containerClient) {
          throw new Error('Failed to initialize Blob Storage client');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Failed to initialize Blob Storage client for request', {
          requestId,
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined
        });
        
        return res.status(500).json({
          success: false,
          error: 'Failed to initialize storage service',
          details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
          requestId
        });
      }
    }
    try {
      const { importId } = req.params;
      
      if (!importId) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameter: importId',
        });
        return;
      }

      logger.info(`Processing download request for import ID: ${importId}`);
      
      // Get the import metadata to find the blob URL with SAS token
      const cosmosDb = this.cosmosDb;
      
      try {
        // Get the document from Cosmos DB using the container's item method
        const container = await cosmosDb.container(AZURE_CONFIG.cosmos.containerName, '/_partitionKey');
        const { resource: importMetadata } = await container.item(importId, importId).read<ImportMetadata>();

        if (!importMetadata) {
          logger.warn(`Import metadata not found for ID: ${importId}`);
          res.status(404).json({
            success: false,
            error: 'Import not found',
          });
          return;
        }

        // Check if we have a blob URL with SAS token
        if (!importMetadata.blobUrl) {
          logger.error(`No blob URL found for import ID: ${importId}`);
          res.status(404).json({
            success: false,
            error: 'File not found',
          });
          return;
        }

        // Verify the blob URL is from our storage account for security
        const storageAccount = AZURE_CONFIG.storage.connectionString?.match(/AccountName=([^;]+)/i)?.[1];
        if (storageAccount && !importMetadata.blobUrl.includes(storageAccount)) {
          logger.error(`Invalid blob URL for import ID: ${importId}`);
          res.status(400).json({
            success: false,
            error: 'Invalid file reference',
          });
          return;
        }

        // Set headers for file download
        const fileName = importMetadata.fileName || `export-${importId}${importMetadata.fileType ? '.' + importMetadata.fileType : ''}`;
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        
        try {
          // Extract and decode the blob name from the URL
          const encodedBlobName = importMetadata.blobUrl.split('/').pop() || '';
          const blobName = decodeURIComponent(encodedBlobName); // Decode URL-encoded characters like %20 to spaces
          logger.info(`Downloading blob: ${blobName} from container: ${AZURE_CONFIG.storage.containerName}`);
          
          if (!blobName) {
            throw new Error('Invalid blob name extracted from URL');
          }
          
          // Get a block blob client
          const blockBlobClient = containerClient!.getBlockBlobClient(blobName);
          
          // Check if the blob exists
          logger.debug(`Checking if blob exists: ${blobName}`);
          const exists = await blockBlobClient.exists();
          
          if (!exists) {
            // Try to list blobs to see what's in the container
            try {
              logger.warn(`Blob ${blobName} not found. Listing blobs in container...`);
              for await (const blob of containerClient!.listBlobsFlat()) {
                logger.warn(`Found blob: ${blob.name} (${blob.properties.contentLength} bytes)`);
              }
            } catch (listError: unknown) {
              logger.error('Error listing blobs:', listError);
            }
            
            throw new Error(`Blob ${blobName} not found in container ${AZURE_CONFIG.storage.containerName}`);
          }
          
          // Get blob properties to set correct content type and length
          logger.debug(`Getting properties for blob: ${blobName}`);
          const properties = await blockBlobClient.getProperties();
          const contentType = properties.contentType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          const contentLength = properties.contentLength || 0;
          
          logger.info(`File properties - Type: ${contentType}, Size: ${contentLength} bytes`);
          
          // Set response headers
          res.setHeader('Content-Type', contentType);
          res.setHeader('Content-Length', contentLength);
          res.setHeader('Content-Disposition', `attachment; filename="${importMetadata.fileName || blobName}"`);
          
          logger.info(`Initiating download for: ${blobName} (${contentLength} bytes)`);
          
          // Stream the blob to the response
          logger.debug('Creating download stream...');
          const downloadResponse = await blockBlobClient.download(0);
          const readableStream = downloadResponse.readableStreamBody;
          
          if (!readableStream) {
            throw new Error('Failed to create readable stream from blob');
          }
          
          // Handle stream errors
          readableStream.on('error', (streamError: Error) => {
            logger.error('Error reading from blob stream:', streamError);
            if (!res.headersSent) {
              res.status(500).json({
                success: false,
                error: 'Error reading file from storage',
                details: streamError.message
              });
            } else {
              // If headers are already sent, we can't send a JSON response
              // Just log the error and end the response
              res.end();
            }
          });
          
          // Pipe the stream to the response
          logger.debug('Piping stream to response...');
          return readableStream.pipe(res);
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          const errorStack = error instanceof Error ? error.stack : undefined;
          
          logger.error('Error streaming file:', {
            error: errorMessage,
            stack: errorStack,
            importId,
            blobUrl: importMetadata.blobUrl
          });
          
          return res.status(500).json({
            success: false,
            error: 'Failed to stream file',
            details: errorMessage,
            timestamp: new Date().toISOString()
          });
        }
        
      } catch (error: unknown) {
        logger.error('Error processing download request:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to process download request',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    } catch (error: unknown) {
      logger.error('Error initializing download:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to initialize download',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}