import { Router } from 'express';
import { createQueryRouter } from './query/index.js';
import { AzureCosmosDB } from '../../types/azure.js';

export function createV2Router(cosmosDb: AzureCosmosDB): Router {
  const router = Router();

  // Mount query routes
  router.use('/query', createQueryRouter(cosmosDb));

  // Add other v2 routes here as needed
  // router.use('/other', otherRouter);

  return router;
}
