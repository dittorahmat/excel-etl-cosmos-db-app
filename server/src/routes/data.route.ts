import { Router, type Request, type Response, type NextFunction } from 'express';
import { validateToken } from '../middleware/auth.js';
// TODO: Replace with actual import
async function initializeCosmosDB(): Promise<AzureCosmosDB> { 
  return {
    cosmosClient: {} as any,
    database: {} as any,
    container: async () => ({} as any),
    upsertRecord: async (record) => record,
    query: async () => [],
    getById: async () => undefined,
    deleteRecord: async () => undefined
  };
}
import type { AzureCosmosDB } from '../types/custom.js';

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
  parameters: { name: string, value: any }[];
} {
  const conditions: string[] = [];
  const parameters: { name: string, value: any }[] = [];
  let paramIndex = 0;

  // Handle date range filters
  if (params.startDate) {
    const paramName = `@startDate${paramIndex++}`;
    conditions.push(`(c.date >= ${paramName} OR IS_DEFINED(c.date) = false)`);
    parameters.push({ name: paramName, value: params.startDate });
  }

  if (params.endDate) {
    const paramName = `@endDate${paramIndex++}`;
    conditions.push(`(c.date <= ${paramName} OR IS_DEFINED(c.date) = false)`);
    parameters.push({ name: paramName, value: params.endDate });
  }

  // Handle category filter
  if (params.category) {
    const paramName = `@category${paramIndex++}`;
    conditions.push(`(LOWER(c.category) = LOWER(${paramName}) OR IS_DEFINED(c.category) = false)`);
    parameters.push({ name: paramName, value: params.category });
  }

  // Handle dynamic field filters (exclude known params)
  const excludeParams = ['startDate', 'endDate', 'category', 'limit', 'continuationToken'];
  
  for (const [key, value] of Object.entries(params)) {
    if (excludeParams.includes(key) || !value) continue;
    
    const paramName = `@param${paramIndex++}`;
    
    // Support for array values (comma-separated)
    if (value.includes(',')) {
      const values = value.split(',').map(v => v.trim());
      const orConditions = values.map((v, i) => {
        const arrayParamName = `${paramName}_${i}`;
        parameters.push({ name: arrayParamName, value: v });
        return `LOWER(c.${key}) = LOWER(@${arrayParamName})`;
      });
      conditions.push(`(${orConditions.join(' OR ')})`);
    } else {
      conditions.push(`LOWER(c.${key}) = LOWER(${paramName})`);
      parameters.push({ name: paramName, value });
    }
  }

  // Build the final query
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const query = `SELECT * FROM c ${whereClause} ORDER BY c._ts DESC`;
  
  return { query, parameters };
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
  validateToken as any, // Temporary type assertion to fix middleware type
  async (req: Request, res: Response) => {
  try {
    const cosmosDb = await initializeCosmosDB();
    const queryParams = req.query as unknown as DataQueryParams;
    
    // Set default limit if not provided
    const limit = Math.min(parseInt(queryParams.limit || '100', 10), 1000);
    
    // Build the query from request parameters
    const { query, parameters } = buildQueryFromParams(queryParams);
    
    // Execute the query with pagination
    const queryOptions = {
      parameters,
      maxItemCount: limit,
      continuationToken: queryParams.continuationToken,
    };
    
    // Use the query method from our AzureCosmosDB interface
    const queryResult = await cosmosDb.query(
      query,
      parameters
    );
    
    // The query method returns an array directly, not an object with resources
    const items = Array.isArray(queryResult) ? queryResult : [];
    
    // Prepare response
    const response = {
      items,
      count: items.length,
      // Note: The current AzureCosmosDB.query implementation doesn't support pagination
      // If you need pagination, you'll need to update the query method to return pagination info
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
