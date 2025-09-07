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
   *     parameters:
   *       - in: query
   *         name: relatedTo
   *         schema:
   *           type: string
   *         description: Filter fields to only show those related to the specified field (from the same file)
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
      const { relatedTo } = req.query;
      
      try {
        console.log('Fields endpoint hit - attempting to fetch fields from Cosmos DB');
        
        // Get the container using the container method
        const container = await cosmosDb.container('excel-records', '/_partitionKey');
        
        // Type guard to ensure relatedTo is a string
        const relatedToString = typeof relatedTo === 'string' ? relatedTo : Array.isArray(relatedTo) ? relatedTo[0] as string : null;
        
        if (relatedToString) {
          // If relatedTo parameter is provided, filter fields based on relationships
          console.log(`Fetching fields related to: ${relatedToString}`);
          
          // First, find ALL fileNames for the related field (not just the first one)
          const relatedFieldQuery = container.items.query({
            query: "SELECT c.fileName, c.headers FROM c WHERE c._partitionKey = 'imports' AND ARRAY_CONTAINS(c.headers, @fieldName)",
            parameters: [{ name: '@fieldName', value: relatedToString }]
          });
          
          const relatedFieldResult = await relatedFieldQuery.fetchAll();
          
          if (relatedFieldResult.resources.length === 0) {
            // If we can't find the related field, return all fields as fallback
            console.log(`Could not find related field: ${relatedToString}, returning all fields`);
            const allFieldsQuery = container.items.query({
              query: "SELECT c.headers FROM c WHERE c._partitionKey = 'imports'",
            });
            
            const allFieldsResult = await allFieldsQuery.fetchAll();
            const headers = allFieldsResult.resources || [];
            const uniqueHeaders = [...new Set(headers.flatMap(h => h.headers || []))];
            
            return res.status(200).json({
              success: true,
              fields: uniqueHeaders.map(name => ({
                name,
                type: 'string',
                label: name.split('_').map((word: string) => 
                  word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ')
              }))
            });
          }
          
          // Get ALL fileNames of the related field
          const relatedFileNames = relatedFieldResult.resources.map(resource => resource.fileName);
          console.log(`Found related files: ${relatedFileNames.join(', ')}`);
          
          // Build a query with IN clause for multiple file names
          // Cosmos DB requires individual parameters for IN clause
          const parameters = relatedFileNames.map((fileName, index) => ({
            name: `@fileName${index}`,
            value: fileName
          }));
          
          const fileNamePlaceholders = parameters.map(param => param.name).join(', ');
          const query = `SELECT c.headers FROM c WHERE c._partitionKey = 'imports' AND c.fileName IN (${fileNamePlaceholders})`;
          
          const filteredQuery = container.items.query({
            query,
            parameters
          });
          
          const filteredResult = await filteredQuery.fetchAll();
          const headers = filteredResult.resources || [];
          const uniqueHeaders = [...new Set(headers.flatMap(h => h.headers || []))];
          
          console.log(`Fetched ${uniqueHeaders.length} related fields from ${relatedFileNames.length} files in ${Date.now() - startTime}ms`);
          
          return res.status(200).json({
            success: true,
            fields: uniqueHeaders.map(name => ({
              name,
              type: 'string',
              label: name.split('_').map((word: string) => 
                word.charAt(0).toUpperCase() + word.slice(1)
              ).join(' ')
            }))
          });
        } else {
          // Default behavior - fetch all fields
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
              label: name.split('_').map((word: string) => 
                word.charAt(0).toUpperCase() + word.slice(1)
              ).join(' ')
            }))
          });
        }
        
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