import { Router } from 'express';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { CosmosRecord } from '../types/custom.d.ts';

import { validateToken } from '../middleware/auth.js';
import { initializeCosmosDB } from '../services/cosmos-db/cosmos-db.service.js';

// Conditional auth middleware that only validates tokens if AUTH_ENABLED is true
const conditionalAuth = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.AUTH_ENABLED === 'true') {
    return validateToken(req, res, next);
  }
  next();
};

const router = Router();

// Interface for query parameters
interface DataQueryParams {
  // Date range filters (ISO format or YYYY-MM-DD)
  startDate?: string;
  endDate?: string;
  
  // Category filter (exact match)
  category?: string;
  
  // Pagination
  limit?: string;
  continuationToken?: string;
  
  // Free-form filters (field=value)
  [key: string]: string | undefined;
}

// Helper to build Cosmos DB query from request parameters
function buildQueryFromParams(params: DataQueryParams): {
  query: string;
  parameters: { name: string, value: unknown }[];
  whereClause: string;
} {
  const conditions: string[] = [];
  const parameters: { name: string, value: unknown }[] = [];
  let paramIndex = 0;

  // Handle date range filters
  if (params.startDate) {
    const paramName = `@startDate${paramIndex++}`;
    conditions.push(`(IS_DEFINED(c.date) = false OR c.date >= ${paramName})`);
    parameters.push({ name: paramName, value: params.startDate });
  }

  if (params.endDate) {
    const paramName = `@endDate${paramIndex++}`;
    conditions.push(`(IS_DEFINED(c.date) = false OR c.date <= ${paramName})`);
    parameters.push({ name: paramName, value: params.endDate });
  }

  // Handle category filter
  if (params.category) {
    const paramName = `@category${paramIndex++}`;
    conditions.push(`(IS_DEFINED(c.category) = false OR LOWER(c.category) = LOWER(${paramName}))`);
    parameters.push({ name: paramName, value: params.category });
  }

  // Handle dynamic field filters (exclude known params)
  const excludeParams = ['startDate', 'endDate', 'category', 'limit', 'continuationToken', 'page', 'pageSize'];
  
  for (const [key, value] of Object.entries(params)) {
    if (excludeParams.includes(key) || !value) continue;
    
    // Skip any non-string values that might cause issues
    if (typeof value !== 'string') continue;
    
    const paramName = `@param${paramIndex++}`;
    
    // Support for array values (comma-separated)
    if (value.includes(',')) {
      const values = value.split(',').map(v => v.trim()).filter(Boolean);
      if (values.length === 0) continue;
      
      const orConditions = values.map((v, i) => {
        const arrayParamName = `${paramName}_${i}`;
        parameters.push({ name: arrayParamName, value: v });
        return `(IS_DEFINED(c.${key}) = false OR LOWER(c.${key}) = LOWER(@${arrayParamName}))`;
      });
      conditions.push(`(${orConditions.join(' OR ')})`);
    } else {
      conditions.push(`(IS_DEFINED(c.${key}) = false OR LOWER(c.${key}) = LOWER(${paramName}))`);
      parameters.push({ name: paramName, value });
    }
  }

  // Build the base query without ORDER BY for counting
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  // Explicitly list fields instead of using c.* to avoid syntax errors
  const baseQuery = `SELECT c.id, c.date, c.category, c.fileName, c.filePath, c.uploadedAt, c.uploadedBy, c.metadata FROM c ${whereClause}`;
  
  return { query: baseQuery, parameters, whereClause };
}

/**
 * @openapi
 * /api/data:
 *   get:
 *     summary: Query data from Cosmos DB with dynamic filters
 *     description: |
 *       Fetches data from Cosmos DB with support for filtering, sorting, and pagination.
 *       All string comparisons are case-insensitive.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter records with date >= startDate (ISO format or YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter records with date <= endDate (ISO format or YYYY-MM-DD)
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category (exact match, case-insensitive)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *           default: 100
 *         description: Maximum number of records to return (1-1000)
 *       - in: query
 *         name: continuationToken
 *         schema:
 *           type: string
 *         description: Token for pagination (from previous response)
 *       - in: query
 *         name: [field]
 *         schema:
 *           type: string
 *         description: Filter by any field (exact match, case-insensitive). For multiple values, use comma-separated values.
 *     responses:
 *       200:
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                 continuationToken:
 *                   type: string
 *                   description: Token for pagination (if more results available)
 *                 count:
 *                   type: integer
 *                   description: Number of items returned in this batch
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get(
  '/',
  conditionalAuth as RequestHandler,
  async (req: Request, res: Response) => {
  try {
    const db = await initializeCosmosDB();
    const queryParams = req.query as unknown as DataQueryParams;
    
    // Set default pagination values
    const page = Math.max(1, parseInt(queryParams.page as string || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(queryParams.pageSize as string || '10', 10)));
    const offset = (page - 1) * pageSize;
    
    // Build the queries from request parameters
    const { query: baseQuery, parameters, whereClause } = buildQueryFromParams(queryParams);
    
    // Log the generated queries for debugging
    console.log('===== QUERY DEBUGGING =====');
    console.log('Base query:', baseQuery);
    console.log('Where clause:', whereClause);
    console.log('Raw parameters:', JSON.stringify(parameters, null, 2));
    
    // Build count query - ensure it's a simple COUNT query
    const countQuery = `SELECT VALUE COUNT(1) FROM c ${whereClause}`.replace(/\s+/g, ' ').trim();
    console.log('\n--- COUNT QUERY ---');
    console.log(countQuery);
    
    // Format parameters with @ prefix and log them
    const formattedParameters = parameters.map((p, _i) => {
      const paramName = p.name.startsWith('@') ? p.name : `@${p.name}`;
      return { name: paramName, value: p.value };
    });
    
    console.log('\n--- PARAMETERS ---');
    console.log(JSON.stringify(formattedParameters, null, 2));
    
    // First try with a very simple count query to isolate the issue
    let totalCount = 0;
    try {
      console.log('\n--- EXECUTING SIMPLE COUNT ---');
      const simpleCountQuery = 'SELECT VALUE COUNT(1) FROM c';
      console.log('Simple count query:', simpleCountQuery);
      const simpleCountResult = await db.query(simpleCountQuery, []);
      console.log('Simple count result:', simpleCountResult);
      totalCount = Array.isArray(simpleCountResult) && simpleCountResult.length > 0 ? Number(simpleCountResult[0]) : 0;
      console.log('Total count (simple):', totalCount);
      
      // If simple count works, try the filtered count
      if (whereClause) {
        console.log('\n--- EXECUTING FILTERED COUNT ---');
        console.log('Filtered count query:', countQuery);
        const filteredCountResult = await db.query(countQuery, formattedParameters);
        console.log('Filtered count result:', filteredCountResult);
        totalCount = Array.isArray(filteredCountResult) && filteredCountResult.length > 0 ? Number(filteredCountResult[0]) : 0;
        console.log('Total count (filtered):', totalCount);
      }
    } catch (error) {
      const countError = error as Error;
      console.error('Error executing count query:', countError);
      throw new Error(`Count query failed: ${countError.message}`);
    }
    
    // Build and execute the main query
    const paginatedQuery = `${baseQuery} ORDER BY c._ts DESC OFFSET ${offset} LIMIT ${pageSize}`.replace(/\s+/g, ' ').trim();
    console.log('\n--- PAGINATED QUERY ---');
    console.log(paginatedQuery);
    
    let items: CosmosRecord[] = [];
    try {
      console.log('\n--- EXECUTING MAIN QUERY ---');
      const queryResult = await db.query(paginatedQuery, formattedParameters);
      items = Array.isArray(queryResult) ? queryResult : [];
      console.log('Query returned items count:', items.length);
    } catch (error) {
      const queryError = error as Error;
      console.error('Error executing main query:', queryError);
      throw new Error(`Main query failed: ${queryError.message}`);
    }
    
    // Prepare response
    const response = {
      items: Array.isArray(items) ? items : [],
      count: Array.isArray(items) ? items.length : 0,
      total: totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize)
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error querying Cosmos DB:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'An unknown error occurred',
    });
  }
});

export default router;
