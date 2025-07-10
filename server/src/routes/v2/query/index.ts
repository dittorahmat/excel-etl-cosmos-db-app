import { Router } from 'express';
import { authenticateToken } from '../../../middleware/auth.js';
import { queryImportRowsHandler } from './handlers/query-import-rows.handler.js';
import { queryAllRowsHandler } from './handlers/query-all-rows.handler.js';
import { getImportMetadataHandler } from './handlers/get-import-metadata.handler.js';
import { listImportsHandler } from './handlers/list-imports.handler.js';
import { downloadImportHandler } from './handlers/download-import.handler.js';

// Create router
const router = Router();

// Apply authentication middleware if enabled
const authRequired = process.env.AUTH_ENABLED === 'true';

// Define routes
if (authRequired) {
  router.use(authenticateToken);
}

// Query rows from a specific import
router.get('/imports/:importId/rows', queryImportRowsHandler.handle.bind(queryImportRowsHandler));

// Query rows across all imports
router.get('/rows', queryAllRowsHandler.handle.bind(queryAllRowsHandler));

// Query exactly Name, Email, Phone
import { queryRowsExactHandler } from './handlers/query-rows-exact.handler.js';
import express from 'express';

// Add JSON body parser middleware specifically for this route
router.post('/rows', 
  express.json(), // Add JSON body parser middleware
  queryRowsExactHandler.handle.bind(queryRowsExactHandler)
);

// Get import metadata by ID
router.get('/imports/:importId', getImportMetadataHandler.handle.bind(getImportMetadataHandler));

// List all imports with pagination
router.get('/imports', listImportsHandler.handle.bind(listImportsHandler));
router.post('/imports', listImportsHandler.handle.bind(listImportsHandler));

// Download import file
router.get('/imports/:importId/download', downloadImportHandler.handle.bind(downloadImportHandler));

export default router;
