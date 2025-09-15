import { Router } from 'express';
import { uploadRouterV2 } from './upload.route.queue.js';
import { createQueryRouter } from './query/index.js';
import { AzureBlobStorage, AzureCosmosDB, Database, CosmosClient } from '../../types/azure.js';
import { importRouterV2 } from './import.route.js';

// Import the queue processor to initialize it
import '../../services/queue/queue.processor.js';

export function createV2Router(azureServices: { 
  blobStorage: AzureBlobStorage, 
  cosmosDb: AzureCosmosDB,
  database: Database,
  cosmosClient: CosmosClient
}): Router {
  const router = Router();

  // Upload router
  router.use('/upload', uploadRouterV2);

  // Import router
  router.use('/import', importRouterV2);

  // Query router
  router.use('/query', createQueryRouter(azureServices.cosmosDb));

  return router;
}
