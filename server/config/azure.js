import { BlobServiceClient } from '@azure/storage-blob';
import { CosmosClient } from '@azure/cosmos';

export const initializeBlobStorage = () => {
  if (!process.env.AZURE_STORAGE_CONNECTION_STRING) {
    throw new Error('AZURE_STORAGE_CONNECTION_STRING is not defined');
  }
  
  const blobServiceClient = BlobServiceClient.fromConnectionString(
    process.env.AZURE_STORAGE_CONNECTION_STRING
  );
  
  return {
    blobServiceClient,
    getContainerClient: (containerName) => 
      blobServiceClient.getContainerClient(containerName)
  };
};

export const initializeCosmosDB = () => {
  if (!process.env.AZURE_COSMOS_CONNECTION_STRING) {
    throw new Error('AZURE_COSMOS_CONNECTION_STRING is not defined');
  }

  const cosmosClient = new CosmosClient(process.env.AZURE_COSMOS_CONNECTION_STRING);
  const database = cosmosClient.database('excel-data');
  
  return {
    cosmosClient,
    getContainer: async (containerName) => {
      const { container } = await database.containers.createIfNotExists({ 
        id: containerName 
      });
      return container;
    }
  };
};

export const CONTAINER_NAMES = {
  UPLOADS: 'excel-uploads',
  RECORDS: 'excel-records'
};
