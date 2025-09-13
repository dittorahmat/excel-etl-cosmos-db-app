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
        
        // Type guard to ensure relatedTo is a string or array of strings
        let relatedToStrings: string[] = [];
        if (typeof relatedTo === 'string') {
          relatedToStrings = [relatedTo];
        } else if (Array.isArray(relatedTo)) {
          relatedToStrings = relatedTo.filter(item => typeof item === 'string') as string[];
        }
        
        if (relatedToStrings.length > 0) {
          // If relatedTo parameter is provided, filter fields based on relationships
          console.log(`Fetching fields related to: ${relatedToStrings.join(', ')}`);
          
          // Find ALL fileNames that contain ALL of the related fields
          // We need to find files that contain each field, then intersect the results
          let commonFileNames: string[] = [];
          
          for (let i = 0; i < relatedToStrings.length; i++) {
            const fieldName = relatedToStrings[i];
            const relatedFieldQuery = container.items.query({
              query: "SELECT c.fileName FROM c WHERE c._partitionKey = 'imports' AND ARRAY_CONTAINS(c.headers, @fieldName)",
              parameters: [{ name: '@fieldName', value: fieldName }]
            } as import('@azure/cosmos').SqlQuerySpec);
            
            const relatedFieldResult = await relatedFieldQuery.fetchAll();
            const fileNames = relatedFieldResult.resources.map(resource => resource.fileName);
            
            if (i === 0) {
              // For the first field, initialize the commonFileNames
              commonFileNames = fileNames;
            } else {
              // For subsequent fields, intersect with the current commonFileNames
              commonFileNames = commonFileNames.filter(fileName => fileNames.includes(fileName));
            }
            
            // If at any point we have no common files, we can stop
            if (commonFileNames.length === 0) {
              break;
            }
          }
          
          if (commonFileNames.length === 0) {
            // If we can't find files containing all related fields, return all fields as fallback
            console.log(`Could not find files containing all related fields: ${relatedToStrings.join(', ')}, returning all fields`);
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
          
          console.log(`Found common files: ${commonFileNames.join(', ')}`);
          
          // Now fetch all fields from ALL documents with any of these common fileNames
          // Build a query with IN clause for multiple file names
          // Cosmos DB requires individual parameters for IN clause
          const parameters = commonFileNames.map((fileName, index) => ({
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
          
          console.log(`Fetched ${uniqueHeaders.length} related fields from ${commonFileNames.length} files in ${Date.now() - startTime}ms`);
          
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
        return res.status(200).json({
          success: true,
          fields: [
            { name: 'test1', type: 'string', label: 'Test 1' },
            { name: 'test2', type: 'string', label: 'Test 2' },
          ],
          _fallback: true,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      return;
    }
  );

  return router;
}