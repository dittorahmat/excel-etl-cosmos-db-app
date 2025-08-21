import { BlobServiceClient } from '@azure/storage-blob';
import { logger } from '../server/src/utils/logger.js';

async function testBlobConnection() {
  try {
    logger.info('Testing Azure Blob Storage connection...');
    
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    
    if (!connectionString) {
      throw new Error('AZURE_STORAGE_CONNECTION_STRING environment variable is not set');
    }
    
    // Create the BlobServiceClient
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    
    // Test connection by listing containers
    const containers = [];
    for await (const container of blobServiceClient.listContainers()) {
      containers.push(container.name);
    }
    
    logger.info('Successfully connected to Azure Blob Storage');
    logger.info(`Available containers: ${containers.join(', ')}`);
    
    // Test access to a specific container
    const containerName = process.env.AZURE_STORAGE_CONTAINER || 'excel-uploads';
    logger.info(`Testing access to container: ${containerName}`);
    
    const containerClient = blobServiceClient.getContainerClient(containerName);
    
    // Check if container exists
    const exists = await containerClient.exists();
    if (!exists) {
      logger.warn(`Container '${containerName}' does not exist. You may need to create it.`);
    } else {
      logger.info(`Container '${containerName}' exists.`);
      
      // List blobs in the container
      const blobs = [];
      for await (const blob of containerClient.listBlobsFlat()) {
        blobs.push(blob.name);
      }
      
      logger.info(`Blobs in container '${containerName}': ${blobs.length} items found`);
      if (blobs.length > 0) {
        logger.info(`First few blobs: ${blobs.slice(0, 5).join(', ')}`);
      }
    }
    
    return { success: true };
  } catch (error) {
    logger.error('Azure Blob Storage connection test failed:', error);
    return { success: false, error: error.message };
  }
}

// Run the test
testBlobConnection()
  .then(({ success }) => {
    logger.info(`Blob Storage test ${success ? 'succeeded' : 'failed'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    logger.error('Unhandled error in Blob Storage test:', error);
    process.exit(1);
  });