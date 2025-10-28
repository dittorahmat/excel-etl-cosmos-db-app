import { Router } from 'express';
import type { Request, Response } from 'express';

import { AzureCosmosDB } from '../types/azure.js';

export function createDistinctValuesRouter(cosmosDb: AzureCosmosDB): Router {
  const router = Router();

  /**
   * @openapi
   * /api/distinct-values:
   *   get:
   *     summary: Get distinct values for specified fields
   *     description: Returns distinct values for the requested fields from the excel-records collection
   *     tags:
   *       - Distinct Values
   *     parameters:
   *       - in: query
   *         name: fields
   *         schema:
   *           type: string
   *         description: Comma-separated list of field names to get distinct values for
   *     responses:
   *       200:
   *         description: Distinct values for the requested fields
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 values:
   *                   type: object
   *                   additionalProperties:
   *                     type: array
   *                     items:
   *                       type: string
   *       400:
   *         description: Missing fields parameter
   *       500:
   *         description: Server error
   */
  router.get(
    '/',
    async (req: Request, res: Response) => {
      const { fields } = req.query;
      
      if (!fields) {
        return res.status(400).json({
          success: false,
          error: 'Fields parameter is required'
        });
      }

      // Convert fields to an array - handle both string and array cases
      const fieldsArray = Array.isArray(fields) ? fields : String(fields).split(',');
      const distinctValues: Record<string, any[]> = {};

      try {
        console.log('Distinct values endpoint hit - attempting to fetch distinct values from Cosmos DB');
        
        // Get the container using the container method
        const container = await cosmosDb.container('excel-records', '/_partitionKey');

        for (const field of fieldsArray) {
          // Clean the field name to prevent injection - ensure it's a string
          const fieldStr = typeof field === 'string' ? field : String(field);
          const cleanField = fieldStr.replace(/[^a-zA-Z0-9 _-]/g, '');
          
          // Use the correct Cosmos DB syntax for accessing field names with spaces
          // With array notation, which works for all field names regardless of special characters
          const query = `SELECT DISTINCT VALUE c["${cleanField}"] FROM c WHERE c.documentType = 'excel-row' AND IS_DEFINED(c["${cleanField}"]) AND c._partitionKey != 'imports'`;
          
          const queryResult = await container.items.query(query).fetchAll();
          const values = queryResult.resources; // The result is already the values since we used VALUE
          
          // Filter out null, undefined, and empty string values
          distinctValues[cleanField] = values.filter(value => 
            value !== null && 
            value !== undefined && 
            (typeof value === 'string' ? value.trim() !== '' : true)
          );

          // If the field is 'Year', make sure all values are numbers
          if (cleanField.toLowerCase().includes('year')) {
            distinctValues[cleanField] = distinctValues[cleanField]
              .map(value => {
                const numValue = Number(value);
                return isNaN(numValue) ? value : numValue;
              })
              .filter(value => !isNaN(value));
          }
        }

        return res.status(200).json({
          success: true,
          values: distinctValues
        });
      } catch (error) {
        console.error('Error fetching distinct values from Cosmos DB:', error);
        
        // Fallback to static data if there's an error
        return res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );

  return router;
}