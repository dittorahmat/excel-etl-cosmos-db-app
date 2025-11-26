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
   *     description: Returns distinct values for the requested fields from the excel-records collection, optionally filtered by other field values
   *     tags:
   *       - Distinct Values
   *     parameters:
   *       - in: query
   *         name: fields
   *         schema:
   *           type: string
   *         description: Comma-separated list of field names to get distinct values for
   *       - in: query
   *         name: Source
   *         schema:
   *           type: string
   *         description: Filter by Source value
   *       - in: query
   *         name: Category
   *         schema:
   *           type: string
   *         description: Filter by Category value
   *       - in: query
   *         name: Sub Category
   *         schema:
   *           type: string
   *         description: Filter by Sub Category value
   *       - in: query
   *         name: Year
   *         schema:
   *           type: string
   *         description: Filter by Year value
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
      const { fields, ...filterParams } = req.query;
      
      if (!fields) {
        return res.status(400).json({
          success: false,
          error: 'Fields parameter is required'
        });
      }

      // Convert fields to an array - handle both string and array cases
      const fieldsArray = Array.isArray(fields) ? fields : String(fields).split(',');
      const distinctValues: Record<string, (string | number | boolean)[]> = {};

      try {
        console.log('Distinct values endpoint hit - attempting to fetch distinct values from Cosmos DB');
        console.log('Filter parameters:', filterParams);
        
        // Get the container using the container method
        const container = await cosmosDb.container('excel-records', '/_partitionKey');

        // Build the base query with filters
        let baseWhereClause = "c.documentType = 'excel-row' AND c._partitionKey != 'imports'";
        const filterConditions: string[] = [];

        // Add filter conditions for each provided filter parameter
        for (const [filterField, filterValue] of Object.entries(filterParams)) {
          if (filterValue !== undefined && filterValue !== null && filterValue !== '') {
            // Clean the filter field name to prevent injection
            const cleanFilterField = String(filterField).replace(/[^a-zA-Z0-9 _-]/g, '');
            
            // Handle multi-value filters like Year (comma-separated)
            if (Array.isArray(filterValue)) {
              const values = filterValue.map(v => String(v).replace(/'/g, "\\'")); // Escape single quotes
              if (values.length > 0) {
                filterConditions.push(`c["${cleanFilterField}"] IN (${values.map(v => `'${v}'`).join(',')})`);
              }
            } else {
              const cleanFilterValue = String(filterValue).replace(/'/g, "\\'"); // Escape single quotes
              filterConditions.push(`c["${cleanFilterField}"] = '${cleanFilterValue}'`);
            }
          }
        }

        // Add all filter conditions to the WHERE clause
        if (filterConditions.length > 0) {
          baseWhereClause += ` AND ${filterConditions.join(' AND ')}`;
        }

        for (const field of fieldsArray) {
          // Clean the field name to prevent injection - ensure it's a string
          const fieldStr = typeof field === 'string' ? field : String(field);
          const cleanField = fieldStr.replace(/[^a-zA-Z0-9 _/-]/g, '');
          
          // Use the correct Cosmos DB syntax for accessing field names with spaces
          // With array notation, which works for all field names regardless of special characters
          const query = `SELECT DISTINCT VALUE c["${cleanField}"] FROM c WHERE ${baseWhereClause} AND IS_DEFINED(c["${cleanField}"])`;
          
          console.log(`Executing query for field ${cleanField}:`, query);
          
          // Use iterator instead of fetchAll to avoid loading all results into memory
          const queryIterator = container.items.query(query);
          const values: (string | number | boolean)[] = [];
          
          while (queryIterator.hasMoreResults()) {
            const result = await queryIterator.fetchNext();
            if (result.resources) {
              values.push(...result.resources);
            }
          }
          
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
              .filter(value => {
                const numValue = Number(value);
                return !isNaN(numValue);
              });
          }
        }

        // For distinct values that are used for filtering, we should be careful about caching
        // Since values could change after new imports, use shorter cache time
        res.set('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes (changed to avoid long-term caching issues)

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