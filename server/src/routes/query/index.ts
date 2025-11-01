import { Router } from 'express';

import express from 'express';
import { AzureCosmosDB } from '../../types/azure.js';
import * as authMiddleware from '../../middleware/auth.js';

import { QueryImportRowsHandler } from '../v2/query/handlers/query-import-rows.handler.js';
import { QueryAllRowsHandler } from '../v2/query/handlers/query-all-rows.handler.js';
import { GetImportMetadataHandler } from '../v2/query/handlers/get-import-metadata.handler.js';
import { ListImportsHandler } from '../v2/query/handlers/list-imports.handler.js';
import { DownloadImportHandler } from '../v2/query/handlers/download-import.handler.js';
import { QueryRowsExactHandler } from '../v2/query/handlers/query-rows-exact.handler.js';
import { QueryRowsGetHandler } from '../v2/query/handlers/query-rows-get.handler.js';
import { DeleteImportHandler } from '../v2/query/handlers/delete-import.handler.js';

import { createFileQueryRouter } from './file.route.js';


export function createQueryRouter(cosmosDb: AzureCosmosDB): Router {
  const router = Router();

  const queryImportRowsHandler = new QueryImportRowsHandler(cosmosDb);
  const queryAllRowsHandler = new QueryAllRowsHandler(cosmosDb);
  const getImportMetadataHandler = new GetImportMetadataHandler(cosmosDb);
  const listImportsHandler = new ListImportsHandler(cosmosDb);
  const downloadImportHandler = new DownloadImportHandler(cosmosDb);
  const queryRowsExactHandler = new QueryRowsExactHandler(cosmosDb);
  const queryRowsGetHandler = new QueryRowsGetHandler(cosmosDb);
  const deleteImportHandler = new DeleteImportHandler();

  // Apply authentication middleware if enabled
  const authRequired = process.env.AUTH_ENABLED === 'true';

  // Define routes with authentication but no access control for queries
  if (authRequired) {
    // Routes that require authentication but not access control
    router.get('/imports/:importId/rows', 
      authMiddleware.authenticateToken,
      queryImportRowsHandler.handle.bind(queryImportRowsHandler)
    );

    router.get('/rows', 
      authMiddleware.authenticateToken,
      queryAllRowsHandler.handle.bind(queryAllRowsHandler)
    );

    router.post('/rows', 
      authMiddleware.authenticateToken,
      express.json(), // Add JSON body parser middleware
      queryRowsExactHandler.handle.bind(queryRowsExactHandler)
    );

    router.get('/rows-get', 
      authMiddleware.authenticateTokenFromUrl,
      queryRowsGetHandler.handle.bind(queryRowsGetHandler)
    );

    router.get('/imports/:importId', 
      authMiddleware.authenticateToken,
      getImportMetadataHandler.handle.bind(getImportMetadataHandler)
    );

    router.get('/imports', 
      authMiddleware.authenticateToken,
      listImportsHandler.handle.bind(listImportsHandler)
    );
    
    router.post('/imports', 
      authMiddleware.authenticateToken,
      listImportsHandler.handle.bind(listImportsHandler)
    );

    router.get('/imports/:importId/download', 
      authMiddleware.authenticateToken,
      downloadImportHandler.handle.bind(downloadImportHandler)
    );

    router.delete('/imports/:importId', 
      authMiddleware.authenticateToken,
      deleteImportHandler.handle.bind(deleteImportHandler)
    );
  } else {
    // In development, routes without authentication
    router.get('/imports/:importId/rows', 
      queryImportRowsHandler.handle.bind(queryImportRowsHandler)
    );

    router.get('/rows', 
      queryAllRowsHandler.handle.bind(queryAllRowsHandler)
    );

    router.post('/rows', 
      express.json(), // Add JSON body parser middleware
      queryRowsExactHandler.handle.bind(queryRowsExactHandler)
    );

    router.get('/rows-get', 
      queryRowsGetHandler.handle.bind(queryRowsGetHandler)
    );

    router.get('/imports/:importId', 
      getImportMetadataHandler.handle.bind(getImportMetadataHandler)
    );

    router.get('/imports', 
      listImportsHandler.handle.bind(listImportsHandler)
    );
    
    router.post('/imports', 
      listImportsHandler.handle.bind(listImportsHandler)
    );

    router.get('/imports/:importId/download', 
      downloadImportHandler.handle.bind(downloadImportHandler)
    );

    router.delete('/imports/:importId', 
      deleteImportHandler.handle.bind(deleteImportHandler)
    );
  }

  // Add file-based query routes
  const fileQueryRouter = createFileQueryRouter(cosmosDb);
  router.use(fileQueryRouter);

  return router;
}