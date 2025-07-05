import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '../../utils/logger.js';
import { authenticateToken } from '../../middleware/auth.js';
import type { SqlParameter } from '@azure/cosmos';
import { isJSONValue } from '../../types/json-types.js';
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
    if (isJSONValue(value)) {
      parameters.push({ name: paramName, value });
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
    
    // Get the container reference - use the same container name as in the ingestion service
    const container = await cosmosDb.container('excel-records', '/_partitionKey');
    
    // Normalize the import ID to handle both single and double 'import_' prefixes
    let fullImportId = importId;
    // Remove all 'import_' prefixes to handle any number of them
    const baseId = fullImportId.replace(/^import_+/g, '');
    // Add exactly one 'import_' prefix
    fullImportId = `import_${baseId}`;
    
    // For rows, we need to try both single and double 'import_' prefixes for _importId
    const possibleImportIds = [fullImportId];
    if (!fullImportId.startsWith('import_import_')) {
      possibleImportIds.push(`import_${fullImportId}`);
    }
    
    logger.info('Querying import rows', {
      importId,
      fullImportId,
      queryParams,
      requestUrl: req.originalUrl
    });
    
    // Build the WHERE clause for the query
    // Try both single and double 'import_' prefixes for _importId
    const whereClauses = [
      `(c._importId IN (${possibleImportIds.map((_, i) => `@importId${i}`).join(', ')}))`,
      'c.documentType = @documentType'
    ];
    
    // Add any additional filters from query parameters
    const filter = queryParams.filter || {};
    const filterParams: SqlParameter[] = [
      ...possibleImportIds.map((id, i) => ({ name: `@importId${i}`, value: id })),
      { name: '@documentType', value: 'excel-row' }
    ];
    
    // Add partition key filter if needed
    // Note: We don't filter by _partitionKey here since rows should be queried by _importId
    // and documentType only for better performance
    
    // Add additional filters from query parameters
    Object.entries(filter).forEach(([key, value], index) => {
      const paramName = `@param${index}`;
      whereClauses.push(`c["${key}"] = ${paramName}`);
      if (isJSONValue(value)) {
      filterParams.push({ name: paramName, value });
    }
    });
    
    // Build the full query
    const query = {
      query: `SELECT * FROM c WHERE ${whereClauses.join(' AND ')}`,
      parameters: filterParams,
    };
    
    logger.debug('Executing Cosmos DB query', {
      query: query.query,
      parameters: query.parameters,
      fullImportId
    });
    
    // Execute the query to get the rows
    const { resources: items, requestCharge } = await container.items
      .query(query)
      .fetchAll();
    
    logger.info('Import rows query results', {
      importId: fullImportId,
      rowCount: items.length,
      requestCharge,
      sampleItem: items.length > 0 ? {
        id: items[0].id,
        _importId: items[0]._importId,
        _partitionKey: items[0]._partitionKey,
        documentType: items[0].documentType,
        // Include a few sample fields without logging the entire row
        sampleFields: Object.entries(items[0])
          .filter(([key]) => !['id', '_importId', '_partitionKey', 'documentType'].includes(key))
          .slice(0, 3)
          .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {})
      } : null
    });
    
    // If no rows found, log potential issues
    if (items.length === 0) {
      // Check if any documents exist with any of the possible import IDs
      const orConditions = possibleImportIds.map((_, i) => `c._importId = @importId${i}`).join(' OR ');
      const { resources: docsWithImportId } = await container.items
        .query({
          query: `SELECT * FROM c WHERE (${orConditions})`,
          parameters: possibleImportIds.map((id, i) => ({ name: `@importId${i}`, value: id }))
        })
        .fetchAll();
      
      if (docsWithImportId.length > 0) {
        logger.warn('Found documents with matching _importId but not matching documentType', {
          importId: fullImportId,
          possibleImportIds,
          foundDocs: docsWithImportId.map(doc => ({
            id: doc.id,
            _importId: doc._importId,
            _partitionKey: doc._partitionKey,
            documentType: doc.documentType
          }))
        });
      } else {
        logger.warn('No documents found with the specified _importId', {
          importId: fullImportId,
          query: 'SELECT * FROM c WHERE c._importId = @importId',
          parameters: [{ name: '@importId', value: fullImportId }]
        });
      }
    }
    
    // Get total count for pagination
    const countQuery = {
      query: `SELECT VALUE COUNT(1) FROM c WHERE ${whereClauses.join(' AND ')}`,
      parameters: filterParams,
    };
    
    const { resources: [totalCount], requestCharge: countCharge } = await container.items
      .query(countQuery)
      .fetchAll();
    
    logger.debug('Count query results', {
      importId: fullImportId,
      totalCount,
      requestCharge: countCharge
    });
    
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
    
    // Normalize the import ID to handle both single and double 'import_' prefixes
    let fullImportId = importId;
    // Remove all 'import_' prefixes to handle any number of them
    const baseId = fullImportId.replace(/^import_+/g, '');
    // Add exactly one 'import_' prefix
    fullImportId = `import_${baseId}`;
    
    const partitionKey = 'imports';
    
    logger.info('Normalized import ID', { originalId: importId, normalizedId: fullImportId });
    
    logger.info('Fetching import metadata', { 
      importId, 
      fullImportId, 
      partitionKey,
      query: 'SELECT * FROM c WHERE c.id = @importId AND c._partitionKey = @partitionKey',
      parameters: [
        { name: '@importId', value: fullImportId },
        { name: '@partitionKey', value: partitionKey }
      ]
    });
    
    // First try with the normalized ID (single 'import_' prefix)
    let query = {
      query: 'SELECT * FROM c WHERE c.id = @importId AND c._partitionKey = @partitionKey',
      parameters: [
        { name: '@importId', value: fullImportId },
        { name: '@partitionKey', value: partitionKey }
      ]
    };
    
    logger.info('Executing Cosmos DB query', { query });
    
    let { resources } = await container.items.query(query).fetchAll();
    
    // If not found, try with double 'import_' prefix
    if (resources.length === 0 && !fullImportId.startsWith('import_import_')) {
      const doublePrefixedId = `import_${fullImportId}`;
      logger.info('Trying with double import_ prefix', { doublePrefixedId });
      
      query = {
        query: 'SELECT * FROM c WHERE c.id = @importId AND c._partitionKey = @partitionKey',
        parameters: [
          { name: '@importId', value: doublePrefixedId },
          { name: '@partitionKey', value: partitionKey }
        ]
      };
      
      const result = await container.items.query(query).fetchAll();
      resources = result.resources;
    }
    
    logger.info('Import metadata query results', { 
      importId: fullImportId, 
      found: resources.length > 0,
      resourceCount: resources.length,
      firstResource: resources[0] ? { 
        id: resources[0].id, 
        _partitionKey: resources[0]._partitionKey,
        fileName: resources[0].fileName,
        status: resources[0].status
      } : null
    });
    
    if (resources.length === 0) {
      // Try to find any document with a matching ID to help with debugging
      const { resources: anyDoc } = await container.items
        .query({
          query: 'SELECT * FROM c WHERE c.id = @importId',
          parameters: [{ name: '@importId', value: fullImportId }]
        })
        .fetchAll();
      
      if (anyDoc.length > 0) {
        logger.warn('Found document with matching ID but different partition key', {
          importId: fullImportId,
          actualPartitionKey: anyDoc[0]._partitionKey,
          expectedPartitionKey: partitionKey
        });
      }
      
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'The requested resource was not found.'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: resources[0]
    });
  } catch (error) {
    logger.error('Failed to get import metadata', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      importId,
      reqParams: req.params,
      reqQuery: req.query
    });
    
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
