import { Router } from 'express';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { logger } from '../utils/logger.js';
import { validateToken } from '../middleware/auth.js';
import { AzureCosmosDB } from '../types/azure.js';

export function createFieldsRouter(cosmosDb: AzureCosmosDB): Router {
  const router = Router();

  // Conditional auth middleware that only validates tokens if AUTH_ENABLED is true
  const conditionalAuth = (req: Request, res: Response, next: NextFunction) => {
    if (process.env.AUTH_ENABLED === 'true') {
      return validateToken(req, res, next);
    }
    next();
  };

  /**
   * @openapi
   * /api/fields:
   *   get:
   *     summary: Get list of all available fields across all imports
   *     description: Returns a list of all unique field names found in the imports collection
   *     tags:
   *       - Fields
   *     responses:
   *       200:
   *         description: List of available fields
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 fields:
   *                   type: array
   *                   items:
   *                     type: string
   *       500:
   *         description: Server error
   */
  router.get(
    '/',
    conditionalAuth as RequestHandler,
    async (req: Request, res: Response) => {
      try {
        const cosmosService = cosmosDb;
        const container = await cosmosService.database.container('excel-records');
        
        // Get a sample of records from the container to extract field names
        const sampleSize = 100; // Adjust this number based on your needs
        const query = {
          query: 'SELECT TOP @sampleSize * FROM c',
          parameters: [
            { name: '@sampleSize', value: sampleSize }
          ]
        };

        const { resources: sampleRecords } = await container.items.query(query).fetchAll();
        
        // Collect all unique field names from all sample records
        const fieldSet = new Set<string>();
        
        if (sampleRecords && sampleRecords.length > 0) {
          sampleRecords.forEach(record => {
            // Skip system properties that start with _
            for (const key in record) {
              if (!key.startsWith('_')) {
                fieldSet.add(key);
              }
            }
          });
          
          const fields = Array.from(fieldSet).sort();
          const fieldDefinitions = fields.map(field => ({
            name: field,
            type: 'string', // Default to string, as type inference from sample data is complex
            label: field,
          }));
          logger.info(`Found ${fieldDefinitions.length} unique fields across ${sampleRecords.length} sample records. Transformed fields: ${JSON.stringify(fieldDefinitions)}`);
          
          return res.status(200).json({
            success: true,
            fields: fieldDefinitions
          });
        }
        
        // Fallback to empty array if no records found
        logger.warn('No records found to extract fields from');
        res.status(200).json({
          success: true,
          fields: []
        });
        
      } catch (error) {
        console.error('Error fetching fields:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to fetch fields',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );

  return router;
}