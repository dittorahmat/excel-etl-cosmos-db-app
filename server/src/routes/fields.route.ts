import { Router } from 'express';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { getOrInitializeCosmosDB } from '../services/cosmos-db/cosmos-db.service.js';
import { logger } from '../utils/logger.js';
import { validateToken } from '../middleware/auth.js';

// Conditional auth middleware that only validates tokens if AUTH_ENABLED is true
const conditionalAuth = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.AUTH_ENABLED === 'true') {
    return validateToken(req, res, next);
  }
  next();
};

const router = Router();

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
      const cosmosService = await getOrInitializeCosmosDB();
      const container = await cosmosService.database.container('excel-records');
      
      // First, get all unique field names from the records
      const query = {
        query: 'SELECT DISTINCT VALUE c["_partitionKey"] FROM c'
      };

      const { resources: partitionKeys } = await container.items.query(query).fetchAll();
      
      // If we have partition keys, try to get fields from one of them
      if (partitionKeys && partitionKeys.length > 0) {
        const sampleQuery = {
          query: 'SELECT TOP 1 * FROM c WHERE c["_partitionKey"] = @partitionKey',
          parameters: [
            { name: '@partitionKey', value: partitionKeys[0] }
          ]
        };
        
        const { resources: sampleRecords } = await container.items.query(sampleQuery).fetchAll();
        
        if (sampleRecords && sampleRecords.length > 0) {
          // Get all field names from the sample record
          const fieldSet = new Set<string>();
          const record = sampleRecords[0];
          
          // Skip system properties that start with _
          for (const key in record) {
            if (!key.startsWith('_')) {
              fieldSet.add(key);
            }
          }
          
          const fields = Array.from(fieldSet);
          logger.info(`Found ${fields.length} unique fields in sample record`);
          
          return res.status(200).json({
            success: true,
            fields
          });
        }
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

export default router;
