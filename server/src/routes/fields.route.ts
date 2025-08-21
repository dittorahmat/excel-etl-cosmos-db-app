import { Router } from 'express';
import type { Request, Response } from 'express';


import { AzureCosmosDB } from '../types/azure.js';

export function createFieldsRouter(cosmosDb: AzureCosmosDB): Router {
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
    async (req: Request, res: Response) => {
      const startTime = Date.now();
      
      try {
        console.log('Fields endpoint hit - attempting to fetch fields from Cosmos DB');
        
        // Get the container using the container method
        const container = await cosmosDb.container('excel-records', '/_partitionKey');
        
        // Try to get fields from Cosmos DB with a timeout
        const fieldsPromise = container.items
          .query({
            query: "SELECT c.headers FROM c WHERE c._partitionKey = 'imports'",
          })
          .fetchAll();
          
        // Set a timeout for the database query
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database query timed out')), 5000)
        );
        
        // Race the query against the timeout
        const result = await Promise.race([fieldsPromise, timeoutPromise]);
        
        // Type the Cosmos DB response
        interface CosmosFieldResult {
          resources: Array<{ headers: string[] }>;
        };
        
        console.log('Raw Cosmos DB query result:', result);
        const headers = (result as CosmosFieldResult)?.resources || [];
        const uniqueHeaders = [...new Set(headers.flatMap(h => h.headers || []))];
        console.log(`Fetched ${uniqueHeaders.length} fields from Cosmos DB in ${Date.now() - startTime}ms`);
        console.log('Unique headers extracted:', uniqueHeaders);
        
        // Return the fields from Cosmos DB
        res.status(200).json({
          success: true,
          fields: uniqueHeaders.map(name => ({
            name,
            type: 'string',
            label: name.split('_').map(word => 
              word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ')
          }))
        });
        
      } catch (error) {
        console.error('Error fetching fields from Cosmos DB, falling back to static data:', error);
        
        // Fallback to static data if there's an error
        res.status(200).json({
          success: true,
          fields: [
            { name: 'test1', type: 'string', label: 'Test 1' },
            { name: 'test2', type: 'string', label: 'Test 2' },
          ],
          _fallback: true,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );

  return router;
}