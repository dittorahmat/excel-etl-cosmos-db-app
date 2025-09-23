import { Router } from 'express';

import express from 'express';
import { AzureCosmosDB } from '../../../types/azure.js';
import * as authMiddleware from '../../../middleware/auth.js';
import { accessControlMiddleware } from '../../../middleware/access-control.middleware.js';

import { QueryImportRowsHandler } from './handlers/query-import-rows.handler.js';
import { QueryAllRowsHandler } from './handlers/query-all-rows.handler.js';
import { GetImportMetadataHandler } from './handlers/get-import-metadata.handler.js';
import { ListImportsHandler } from './handlers/list-imports.handler.js';
import { DownloadImportHandler } from './handlers/download-import.handler.js';
import { QueryRowsExactHandler } from './handlers/query-rows-exact.handler.js';
import { QueryRowsGetHandler } from './handlers/query-rows-get.handler.js';
import { DeleteImportHandler } from './handlers/delete-import.handler.js';


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

  // Define routes with authentication and access control where needed
  if (authRequired) {
    // Routes that require both authentication and access control
    router.get('/imports/:importId/rows', 
      authMiddleware.authenticateToken,
      accessControlMiddleware,
      queryImportRowsHandler.handle.bind(queryImportRowsHandler)
    );

    router.get('/rows', 
      authMiddleware.authenticateToken,
      accessControlMiddleware,
      queryAllRowsHandler.handle.bind(queryAllRowsHandler)
    );

    router.post('/rows', 
      authMiddleware.authenticateToken,
      accessControlMiddleware,
      express.json(), // Add JSON body parser middleware
      queryRowsExactHandler.handle.bind(queryRowsExactHandler)
    );

    router.get('/rows-get', 
      authMiddleware.authenticateToken,
      accessControlMiddleware,
      queryRowsGetHandler.handle.bind(queryRowsGetHandler)
    );

    router.get('/imports/:importId', 
      authMiddleware.authenticateToken,
      accessControlMiddleware,
      getImportMetadataHandler.handle.bind(getImportMetadataHandler)
    );

    router.get('/imports', 
      authMiddleware.authenticateToken,
      accessControlMiddleware,
      listImportsHandler.handle.bind(listImportsHandler)
    );
    
    router.post('/imports', 
      authMiddleware.authenticateToken,
      accessControlMiddleware,
      listImportsHandler.handle.bind(listImportsHandler)
    );

    router.get('/imports/:importId/download', 
      authMiddleware.authenticateToken,
      accessControlMiddleware,
      downloadImportHandler.handle.bind(downloadImportHandler)
    );

    router.delete('/imports/:importId', 
      authMiddleware.authenticateToken,
      accessControlMiddleware,
      deleteImportHandler.handle.bind(deleteImportHandler)
    );
  } else {
    // In development, routes without authentication but with access control
    router.get('/imports/:importId/rows', 
      accessControlMiddleware,
      queryImportRowsHandler.handle.bind(queryImportRowsHandler)
    );

    router.get('/rows', 
      accessControlMiddleware,
      queryAllRowsHandler.handle.bind(queryAllRowsHandler)
    );

    router.post('/rows', 
      accessControlMiddleware,
      express.json(), // Add JSON body parser middleware
      queryRowsExactHandler.handle.bind(queryRowsExactHandler)
    );

    router.get('/rows-get', 
      accessControlMiddleware,
      queryRowsGetHandler.handle.bind(queryRowsGetHandler)
    );

    router.get('/imports/:importId', 
      accessControlMiddleware,
      getImportMetadataHandler.handle.bind(getImportMetadataHandler)
    );

    router.get('/imports', 
      accessControlMiddleware,
      listImportsHandler.handle.bind(listImportsHandler)
    );
    
    router.post('/imports', 
      accessControlMiddleware,
      listImportsHandler.handle.bind(listImportsHandler)
    );

    router.get('/imports/:importId/download', 
      accessControlMiddleware,
      downloadImportHandler.handle.bind(downloadImportHandler)
    );

    router.delete('/imports/:importId', 
      accessControlMiddleware,
      deleteImportHandler.handle.bind(deleteImportHandler)
    );
  }

  return router;
}