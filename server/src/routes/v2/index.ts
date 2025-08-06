import { Router } from 'express';
import { createQueryRouter } from './query/index.js';
import { uploadRouterV2 } from './upload.route.js';
import { AzureCosmosDB } from '../../types/azure.js';

export function createV2Router(cosmosDb: AzureCosmosDB): Router {
  const router = Router();

  // Mount query routes
  router.use('/query', createQueryRouter(cosmosDb));
  
  // Mount upload route
  router.use('/upload', uploadRouterV2);

  // Add other v2 routes here as needed
  // router.use('/other', otherRouter);

  return router;
}
