import { Router } from 'express';
import { requireAuthOrApiKey } from '../../../middleware/authMiddleware.js';
import express from 'express';
import { AzureCosmosDB } from '../../../types/azure.js';

import { QueryImportRowsHandler } from './handlers/query-import-rows.handler.js';
import { QueryAllRowsHandler } from './handlers/query-all-rows.handler.js';
import { GetImportMetadataHandler } from './handlers/get-import-metadata.handler.js';
import { ListImportsHandler } from './handlers/list-imports.handler.js';
import { DownloadImportHandler } from './handlers/download-import.handler.js';
import { QueryRowsExactHandler } from './handlers/query-rows-exact.handler.js';
import { QueryRowsGetHandler } from './handlers/query-rows-get.handler.js';


export function createQueryRouter(cosmosDb: AzureCosmosDB): Router {
  const router = Router();

  const queryImportRowsHandler = new QueryImportRowsHandler(cosmosDb);
  const queryAllRowsHandler = new QueryAllRowsHandler(cosmosDb);
  const getImportMetadataHandler = new GetImportMetadataHandler(cosmosDb);
  const listImportsHandler = new ListImportsHandler(cosmosDb);
  const downloadImportHandler = new DownloadImportHandler(cosmosDb);
  const queryRowsExactHandler = new QueryRowsExactHandler(cosmosDb);
  const queryRowsGetHandler = new QueryRowsGetHandler(cosmosDb);

  // Apply authentication middleware if enabled
  const authRequired = process.env.AUTH_ENABLED === 'true';

  // Define routes
  if (authRequired) {
    // TODO: Initialize repositories and pass them to requireAuthOrApiKey
    // For now, we'll skip authentication if AUTH_ENABLED is false
    // router.use(requireAuthOrApiKey({
    //   apiKeyRepository: /* initialize repository */,
    //   apiKeyUsageRepository: /* initialize repository */
    // }));
  }

  // Query rows from a specific import
  router.get('/imports/:importId/rows', queryImportRowsHandler.handle.bind(queryImportRowsHandler));

  // Query rows across all imports
  router.get('/rows', queryAllRowsHandler.handle.bind(queryAllRowsHandler));

  // Add JSON body parser middleware specifically for this route
  router.post('/rows', 
    express.json(), // Add JSON body parser middleware
    queryRowsExactHandler.handle.bind(queryRowsExactHandler)
  );

  // Query exactly Name, Email, Phone (GET for API Query Builder)
  router.get('/rows-get', queryRowsGetHandler.handle.bind(queryRowsGetHandler));

  // Get import metadata by ID
  router.get('/imports/:importId', getImportMetadataHandler.handle.bind(getImportMetadataHandler));

  // List all imports with pagination
  router.get('/imports', listImportsHandler.handle.bind(listImportsHandler));
  router.post('/imports', listImportsHandler.handle.bind(listImportsHandler));

  // Download import file
  router.get('/imports/:importId/download', downloadImportHandler.handle.bind(downloadImportHandler));

  return router;
}