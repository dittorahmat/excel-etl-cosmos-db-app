import { Router } from 'express';
import { uploadRouterV2 } from './upload.route.js';
import { createQueryRouter } from './query/index.js';
import { AzureBlobStorage, AzureCosmosDB, Database, CosmosClient } from '../../types/azure.js';
import { importRouterV2 } from './import.route.js';
import { accessControlRouter } from '../access-control.route.js'; // Direct import

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

  // Access control router
  router.use('/access-control', accessControlRouter);

  // Query router
  router.use('/query', createQueryRouter(azureServices.cosmosDb));

  return router;
}
