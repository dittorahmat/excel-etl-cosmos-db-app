import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '../../utils/logger.js';
import { authenticateToken } from '../../middleware/auth.js';
import type { SqlParameter } from '@azure/cosmos';
import { getOrInitializeCosmosDB } from '../../services/cosmos-db/cosmos-db.service.js';

const router = Router();

// Query parameter schema for validation
const queryParamsSchema = z.object({
  // Filtering
  filter: z.record(z.string(), z.unknown()).optional(),
  
  // Pagination
  limit: z.coerce.number().int().positive().max(1000).default(100),
  offset: z.coerce.number().int().min(0).default(0),
  
  // Sorting
  sort: z.string().optional(),
  
  // Field selection
  fields: z.string().optional(),
  
  // Search
  q: z.string().optional(),
});

type QueryParams = z.infer<typeof queryParamsSchema>;

/**
 * Build a Cosmos DB query from request parameters
 */
function buildCosmosQuery(params: QueryParams, importId?: string) {
  const { filter = {}, limit, offset, sort, fields, q } = params;
  
  // Start with a base query
  let query = 'SELECT';
  const parameters: SqlParameter[] = [];
  
  // Field selection
  if (fields) {
    const fieldList = fields.split(',').map(f => f.trim()).filter(Boolean);
    if (fieldList.length > 0) {
      query += ` ${fieldList.map(f => `c["${f}"]`).join(', ')}`;
    } else {
      query += ' *';
    }
  } else {
    query += ' *';
  }
  
  query += ' FROM c';
  
  // Add WHERE clause for import ID if provided
  const whereClauses: string[] = [];
  
  if (importId) {
    whereClauses.push('c._importId = @importId');
    parameters.push({ name: '@importId', value: importId } as SqlParameter);
  }
  
  // Add filter conditions
  Object.entries(filter).forEach(([key, value], index) => {
    const paramName = `@param${index}`;
    whereClauses.push(`c["${key}"] = ${paramName}`);
    // Ensure value is a valid JSON value (string, number, boolean, null, or array/object of these)
    if (value !== undefined && value !== null) {
      parameters.push({ 
        name: paramName, 
        value: value as unknown
      } as SqlParameter);
    }
  });
  
  // Add full-text search if provided
  if (q) {
    whereClauses.push('CONTAINS(c._search, @searchTerm)');
    parameters.push({ 
      name: '@searchTerm', 
      value: q.toLowerCase() 
    } as SqlParameter);
  }
  
  // Combine WHERE clauses
  if (whereClauses.length > 0) {
    query += ' WHERE ' + whereClauses.join(' AND ');
  }
  
  // Add ORDER BY
  if (sort) {
    const [field, direction] = sort.startsWith('-') 
      ? [sort.slice(1), 'DESC'] 
      : [sort, 'ASC'];
    
    query += ` ORDER BY c["${field}"] ${direction}`;
  }
  
  // Add pagination
  query += ` OFFSET ${offset} LIMIT ${limit}`;
  
  return { query, parameters };
}

/**
 * Query rows from a specific import
 */
async function queryImportRows(req: Request, res: Response) {
  const { importId } = req.params;
  const queryParams = queryParamsSchema.parse(req.query);
  
  try {
    const cosmosDb = await getOrInitializeCosmosDB();
    const { query, parameters } = buildCosmosQuery(queryParams, importId);
    
    // Get the container reference - use the same container name as in the ingestion service
    const container = await cosmosDb.container('excel-records', '/_partitionKey');
    
    // Execute the query
    const { resources: items } = await container.items
      .query({
        query,
        parameters,
      })
      .fetchAll();
    
    // Get total count for pagination
    const countQuery = {
      query: `SELECT VALUE COUNT(1) FROM c ${query.includes('WHERE') ? 'WHERE' + query.split('WHERE')[1] : ''}`,
      parameters,
    };
    
    const { resources: [totalCount] } = await container.items
      .query(countQuery)
      .fetchAll();
    
    return res.status(200).json({
      success: true,
      data: items,
      pagination: {
        total: totalCount || 0,
        limit: queryParams.limit,
        offset: queryParams.offset,
      },
    });
  } catch (error) {
    logger.error('Query failed', { error, importId });
    return res.status(500).json({
      success: false,
      error: 'Failed to execute query',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Query rows across all imports
 */
async function queryAllRows(req: Request, res: Response) {
  const queryParams = queryParamsSchema.parse(req.query);
  
  try {
    const cosmosDb = await getOrInitializeCosmosDB();
    const { query, parameters } = buildCosmosQuery(queryParams);
    
    // Get the container reference - use the same container name as in the ingestion service
    const container = await cosmosDb.container('excel-records', '/_partitionKey');
    
    // Execute the query
    const { resources: items } = await container.items
      .query({
        query,
        parameters,
      })
      .fetchAll();
    
    // Get total count for pagination
    const countQuery = {
      query: `SELECT VALUE COUNT(1) FROM c ${query.includes('WHERE') ? 'WHERE' + query.split('WHERE')[1] : ''}`,
      parameters,
    };
    
    const { resources: [totalCount] } = await container.items
      .query(countQuery)
      .fetchAll();
    
    return res.status(200).json({
      success: true,
      data: items,
      pagination: {
        total: totalCount || 0,
        limit: queryParams.limit,
        offset: queryParams.offset,
      },
    });
  } catch (error) {
    logger.error('Query failed', { error });
    return res.status(500).json({
      success: false,
      error: 'Failed to execute query',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Get import metadata by ID
 */
async function getImportMetadata(req: Request, res: Response) {
  const { importId } = req.params;
  
  try {
    const cosmosDb = await getOrInitializeCosmosDB();
    
    // Get the container reference - use the same container name as in the ingestion service
    const container = await cosmosDb.container('excel-records', '/_partitionKey');
    
    // Query for the import metadata
    const { resources: [importMetadata] } = await container.items
      .query({
        query: 'SELECT * FROM c WHERE c.id = @importId AND c._partitionKey = @partitionKey',
        parameters: [
          { name: '@importId', value: `import_${importId}` },
          { name: '@partitionKey', value: `import_${importId}` }
        ]
      })
      .fetchAll();
    
    if (!importMetadata) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'The requested resource was not found.'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: importMetadata
    });
  } catch (error) {
    logger.error('Failed to get import metadata', { error, importId });
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve import metadata',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * List all imports with pagination
 */
async function listImports(req: Request, res: Response) {
  try {
    const { page = '1', pageSize = '10' } = req.query;
    const pageNum = parseInt(page as string, 10) || 1;
    const pageSizeNum = parseInt(pageSize as string, 10) || 10;
    const offset = (pageNum - 1) * pageSizeNum;
    
    const cosmosDb = await getOrInitializeCosmosDB();
    const container = await cosmosDb.container('excel-records', '/_partitionKey');
    
    // Query for import metadata (documents where id starts with 'import_')
    const query = {
      query: 'SELECT * FROM c WHERE STARTSWITH(c.id, @prefix) ORDER BY c.processedAt DESC OFFSET @offset LIMIT @limit',
      parameters: [
        { name: '@prefix', value: 'import_' },
        { name: '@offset', value: offset },
        { name: '@limit', value: pageSizeNum }
      ]
    };
    
    // Get total count of imports
    const countQuery = {
      query: 'SELECT VALUE COUNT(1) FROM c WHERE STARTSWITH(c.id, @prefix)',
      parameters: [{ name: '@prefix', value: 'import_' }]
    };
    
    const { resources: items } = await container.items.query(query).fetchAll();
    const { resources: [totalCount] } = await container.items.query(countQuery).fetchAll();
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / pageSizeNum);
    
    return res.status(200).json({
      success: true,
      items,
      pagination: {
        page: pageNum,
        pageSize: pageSizeNum,
        total: totalCount,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPreviousPage: pageNum > 1
      }
    });
  } catch (error) {
    logger.error('Failed to list imports', { error });
    return res.status(500).json({
      success: false,
      error: 'Failed to list imports',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// Apply authentication middleware if enabled
const authRequired = process.env.AUTH_ENABLED === 'true';

// Define routes
if (authRequired) {
  router.get('/imports', authenticateToken, listImports);
  router.get('/imports/:importId', authenticateToken, getImportMetadata);
  router.get('/imports/:importId/rows', authenticateToken, queryImportRows);
  router.get('/query', authenticateToken, queryAllRows);
} else {
  // In development, allow queries without authentication
  router.get('/imports', listImports);
  router.get('/imports/:importId', getImportMetadata);
  router.get('/imports/:importId/rows', queryImportRows);
  router.get('/query', queryAllRows);
}

// Health check endpoint
router.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', version: 'v2' });
});

export { router as queryRouterV2 };
