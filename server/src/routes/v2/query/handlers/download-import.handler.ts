import { Request, Response } from 'express';
import { BlobServiceClient } from '@azure/storage-blob';
import { initializeCosmosDB } from '../../../../services/cosmos-db/cosmos-db.service.js';
import { logger } from '../../../../utils/logger.js';
import { AZURE_CONFIG } from '../../../../config/azure-config.js';

// Initialize Blob Service Client with error handling
let blobServiceClient;
let containerClient;

try {
  if (!AZURE_CONFIG.storage.connectionString) {
    throw new Error('Azure Storage connection string is not configured');
  }
  
  if (!AZURE_CONFIG.storage.containerName) {
    throw new Error('Azure Storage container name is not configured');
  }
  
  logger.info(`Initializing BlobServiceClient with container: ${AZURE_CONFIG.storage.containerName}`);
  blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_CONFIG.storage.connectionString);
  containerClient = blobServiceClient.getContainerClient(AZURE_CONFIG.storage.containerName);
  
  // Test the connection
  containerClient.exists().then(exists => {
    logger.info(`Container ${AZURE_CONFIG.storage.containerName} exists: ${exists}`);
  }).catch(error => {
    logger.error('Failed to check container existence:', error);
  });
  
} catch (error) {
  logger.error('Failed to initialize Azure Blob Storage client:', error);
  throw error; // Fail fast if we can't initialize the client
}

interface ImportMetadata {
  id: string;
  fileName: string;
  blobUrl?: string;
  fileType?: string;
}

export class DownloadImportHandler {
  async handle(req: Request, res: Response): Promise<void> {
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
      const cosmosDb = await initializeCosmosDB();
      
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
          const blockBlobClient = containerClient.getBlockBlobClient(blobName);
          
          // Check if the blob exists
          logger.debug(`Checking if blob exists: ${blobName}`);
          const exists = await blockBlobClient.exists();
          
          if (!exists) {
            // Try to list blobs to see what's in the container
            try {
              logger.warn(`Blob ${blobName} not found. Listing blobs in container...`);
              for await (const blob of containerClient.listBlobsFlat()) {
                logger.warn(`Found blob: ${blob.name} (${blob.properties.contentLength} bytes)`);
              }
            } catch (listError) {
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
          readableStream.on('error', (streamError) => {
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
        } catch (error) {
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
        
      } catch (error) {
        logger.error('Error processing download request:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to process download request',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    } catch (error) {
      logger.error('Error initializing download:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to initialize download',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export const downloadImportHandler = new DownloadImportHandler();
