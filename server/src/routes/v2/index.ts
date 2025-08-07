import { Router } from 'express';
import { uploadRouterV2 } from './upload.route.js';
import { createQueryRouter } from './query/index.js';
import { AzureBlobStorage, AzureCosmosDB } from '../../types/azure.js';

export function createV2Router(azureServices: { 
  blobStorage: AzureBlobStorage, 
  cosmosDb: AzureCosmosDB,
  database: any,
  cosmosClient: any
}): Router {
  const router = Router();

  // Upload router
  router.use('/upload', uploadRouterV2);

  // Query router
  router.use('/query', createQueryRouter(azureServices.cosmosDb));

  return router;
}
