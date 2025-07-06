import { Router } from 'express';
import { authenticateToken } from '@/middleware/auth.js';
import { queryImportRowsHandler } from './handlers/query-import-rows.handler.js';
import { queryAllRowsHandler } from './handlers/query-all-rows.handler.js';
import { getImportMetadataHandler } from './handlers/get-import-metadata.handler.js';
import { listImportsHandler } from './handlers/list-imports.handler.js';

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

// Get import metadata by ID
router.get('/imports/:importId', getImportMetadataHandler.handle.bind(getImportMetadataHandler));

// List all imports with pagination
router.get('/imports', listImportsHandler.handle.bind(listImportsHandler));

export default router;
