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
   *     description: Returns a list of all unique field names found in the imports collection, optionally filtered by special field values
   *     tags:
   *       - Fields
   *     parameters:
   *       - in: query
   *         name: relatedTo
   *         schema:
   *           type: string
   *         description: Filter fields to only show those related to the specified field (from the same file)
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
   *                     type: object
   *                     properties:
   *                       name:
   *                         type: string
   *                       type:
   *                         type: string
   *                       label:
   *                         type: string
   *       500:
   *         description: Server error
   */
  router.get(
    '/',
    async (req: Request, res: Response) => {
      const startTime = Date.now();
      const { relatedTo, ...filterParams } = req.query;
      
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
        
        // Check if special field filters are provided
        const hasSpecialFilters = Object.keys(filterParams).some(key => 
          ['Source', 'Category', 'Sub Category', 'Year'].includes(key) && 
          filterParams[key] !== undefined && 
          filterParams[key] !== null && 
          filterParams[key] !== ''
        );
        
        // Build filter conditions for special fields
        let baseWhereClause = "c.documentType = 'excel-row' AND c._partitionKey != 'imports'";
        const filterConditions: string[] = [];

        // Add filter conditions for each provided filter parameter
        for (const [filterField, filterValue] of Object.entries(filterParams)) {
          if (filterValue !== undefined && filterValue !== null && filterValue !== '') {
            // Skip relatedTo parameter since it's handled separately
            if (filterField === 'relatedTo') continue;
            
            // Clean the filter field name to prevent injection
            const cleanFilterField = String(filterField).replace(/[^a-zA-Z0-9 _-]/g, '');
            
            // Handle multi-value filters like Year (comma-separated)
            if (Array.isArray(filterValue)) {
              const values = filterValue.map(v => {
                // For Year field, preserve number type to match data in DB
                if (cleanFilterField.toLowerCase().includes('year')) {
                  const numValue = Number(v);
                  return isNaN(numValue) ? `'${String(v).replace(/'/g, "\\'")}'` : numValue;
                } else {
                  return `'${String(v).replace(/'/g, "\\'")}'`;
                }
              });
              if (values.length > 0) {
                filterConditions.push(`c["${cleanFilterField}"] IN (${values.join(',')})`);
              }
            } else {
              // For Year field, preserve number type to match data in DB
              if (cleanFilterField.toLowerCase().includes('year')) {
                const numValue = Number(filterValue);
                if (!isNaN(numValue)) {
                  filterConditions.push(`c["${cleanFilterField}"] = ${numValue}`);
                } else {
                  const cleanFilterValue = String(filterValue).replace(/'/g, "\\'"); // Escape single quotes
                  filterConditions.push(`c["${cleanFilterField}"] = '${cleanFilterValue}'`);
                }
              } else {
                const cleanFilterValue = String(filterValue).replace(/'/g, "\\'"); // Escape single quotes
                filterConditions.push(`c["${cleanFilterField}"] = '${cleanFilterValue}'`);
              }
            }
          }
        }

        // Add all filter conditions to the WHERE clause
        if (filterConditions.length > 0) {
          baseWhereClause += ` AND ${filterConditions.join(' AND ')}`;
        }
        
        if (hasSpecialFilters) {
          console.log(`Fetching fields with special filters:`, filterParams);
          console.log(`Base WHERE clause:`, baseWhereClause);
          
          // If special filters are provided, get the actual field names from the filtered records
          // Instead of looking at the imports collection, we query the excel-records directly
          try {
            // First, get a count to understand the scope
            const countQuery = `SELECT VALUE COUNT(1) FROM c WHERE ${baseWhereClause}`;
            // Use iterator instead of fetchAll to avoid loading all results into memory
            const queryIterator = container.items.query(countQuery);
            const countResult = await queryIterator.fetchNext();
            const totalRecords = countResult.resources && countResult.resources.length > 0 ? countResult.resources[0] : 0;
            console.log(`Total records matching filters: ${totalRecords}`);
            
            // Query for records to extract property names
            // Use continuation to get more records if needed, but be mindful of performance
            const allPropertyNames = new Set<string>();
            const systemFields = ['id', 'fileName', '_rid', '_self', '_etag', '_attachments', '_ts', 'documentType', '_partitionKey', '_importId'];
            
            // Use iterator to get all records (with pagination if needed) up to a reasonable limit
            const queryIterator = container.items.query(`SELECT * FROM c WHERE ${baseWhereClause}`, {
              maxItemCount: 100 // Process in batches of 100
            });
            
            let recordCount = 0;
            let hasAppendField = false;
            
            // Iterate through all result pages
            while (queryIterator.hasMoreResults()) {
              const page = await queryIterator.fetchNext();
              const pageRecords = page.resources;
              
              if (pageRecords.length === 0) {
                break; // No more records
              }
              
              // Process each record in the page
              for (const record of pageRecords) {
                recordCount++;
                
                // Extract all property names from this record (excluding system fields)
                Object.keys(record).forEach(key => {
                  // Skip system fields and any field that starts with underscore (metadata)
                  if (!systemFields.includes(key) && !key.startsWith('_')) {
                    allPropertyNames.add(key);
                    if (key === 'Append') {
                      hasAppendField = true;
                      console.log(`Found 'Append' field in record #${recordCount}`);
                    }
                  }
                });
                
                // Add a reasonable limit to prevent excessive processing
                if (recordCount >= 1000) { // Reasonable upper limit
                  console.log(`Reached processing limit of 1000 records, stopping early`);
                  break;
                }
              }
              
              if (recordCount >= 1000) {
                break;
              }
            }
            
            console.log(`Processed ${recordCount} records, found ${allPropertyNames.size} unique field names`);
            console.log(`'Append' field found: ${hasAppendField ? 'YES' : 'NO'}`);
            console.log(`All extracted property names before filtering:`, Array.from(allPropertyNames));
            
            // Remove special filter fields since they're handled separately
            const specialFilterFields = ['Source', 'Category', 'Sub Category', 'Year'];
            const uniqueHeaders = Array.from(allPropertyNames).filter(name => !specialFilterFields.includes(name));
            
            console.log(`Final fields after removing special filter fields:`, uniqueHeaders);
            console.log(`Fetched ${uniqueHeaders.length} fields from filtered records with special filters in ${Date.now() - startTime}ms`);
            
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
          } catch (queryError) {
            console.error('Error querying fields with special filters:', queryError);
            // If direct querying fails, fallback to the original approach
            try {
              const filesQuery = `SELECT DISTINCT c.fileName FROM c WHERE ${baseWhereClause}`;
              
              const queryIterator = container.items.query(filesQuery);
              const fileNames = [];
              
              while (queryIterator.hasMoreResults()) {
                const result = await queryIterator.fetchNext();
                if (result.resources) {
                  fileNames.push(...result.resources.map(resource => resource.fileName).filter(Boolean));
                }
              }
              
              if (fileNames.length === 0) {
                // If no files match the filters, return empty result
                console.log(`No files found matching special filters (fallback):`, filterParams);
                return res.status(200).json({
                  success: true,
                  fields: []
                });
              }
              
              console.log(`Falling back to imports approach, found ${fileNames.length} files matching special filters`);
              
              // Now fetch all fields from ALL documents with these fileNames in the imports partition
              // Build a query with IN clause for multiple file names
              const parameters = fileNames.map((fileName, index) => ({
                name: `@fileName${index}`,
                value: fileName
              }));
              
              const fileNamePlaceholders = parameters.map(param => param.name).join(', ');
              const importsQuery = container.items.query({
                query: `SELECT c.headers FROM c WHERE c._partitionKey = 'imports' AND c.fileName IN (${fileNamePlaceholders})`,
                parameters
              });
              
              // Use iterator instead of fetchAll to avoid loading all results into memory
              const headers = [];
              while (importsQuery.hasMoreResults()) {
                const result = await importsQuery.fetchNext();
                if (result.resources) {
                  headers.push(...result.resources);
                }
              }
              const uniqueHeaders = [...new Set(headers.flatMap(h => h.headers || []))];
              
              console.log(`Fetched ${uniqueHeaders.length} fields from ${fileNames.length} files with special filters (fallback) in ${Date.now() - startTime}ms`);
              
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
            } catch (fallbackError) {
              console.error('Error in fallback approach:', fallbackError);
              // Only return fallback data if both primary and fallback approaches fail
              return res.status(200).json({
                success: true,
                fields: [],
                _fallback: true,
                error: 'Both primary and fallback field queries failed',
                originalError: queryError instanceof Error ? queryError.message : 'Unknown error',
                fallbackError: fallbackError instanceof Error ? fallbackError.message : 'Unknown error'
              });
            }
          }
        } else if (relatedToStrings.length > 0) {
          // If relatedTo parameter is provided, filter fields based on relationships
          console.log(`Fetching fields related to: ${relatedToStrings.join(', ')}`);
          
          try {
            // Find ALL fileNames that contain ALL of the related fields
            // We need to find files that contain each field, then intersect the results
            let commonFileNames: string[] = [];
            
            for (let i = 0; i < relatedToStrings.length; i++) {
              const fieldName = relatedToStrings[i];
              const relatedFieldQuery = container.items.query({
                query: "SELECT c.fileName FROM c WHERE c._partitionKey = 'imports' AND ARRAY_CONTAINS(c.headers, @fieldName)",
                parameters: [{ name: '@fieldName', value: fieldName }]
              });
              
              // Use iterator instead of fetchAll to avoid loading all results into memory
              const fileNames = [];
              while (relatedFieldQuery.hasMoreResults()) {
                const result = await relatedFieldQuery.fetchNext();
                if (result.resources) {
                  fileNames.push(...result.resources.map(resource => resource.fileName));
                }
              }
              
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
              
              // Use iterator instead of fetchAll to avoid loading all results into memory
              const headers = [];
              while (allFieldsQuery.hasMoreResults()) {
                const result = await allFieldsQuery.fetchNext();
                if (result.resources) {
                  headers.push(...result.resources);
                }
              }
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
            
            // Use iterator instead of fetchAll to avoid loading all results into memory
            const headers = [];
            while (filteredQuery.hasMoreResults()) {
              const result = await filteredQuery.fetchNext();
              if (result.resources) {
                headers.push(...result.resources);
              }
            }
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
          } catch (relatedError) {
            console.error('Error in related fields query:', relatedError);
            // Return an empty array if the related fields query fails, instead of falling back to error case
            return res.status(200).json({
              success: true,
              fields: [],
              _error: 'Related fields query failed',
              error: relatedError instanceof Error ? relatedError.message : 'Unknown error'
            });
          }
        } else {
          // Default behavior - fetch all fields
          // Use iterator instead of fetchAll to avoid loading all results into memory
          const queryIterator = container.items
            .query({
              query: "SELECT c.headers FROM c WHERE c._partitionKey = 'imports'",
            });
            
          // Set a timeout for the database query
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Database query timed out')), 5000)
          );
          
          // Execute query with timeout protection using iterator
          let headers = [];
          try {
            const queryPromise = new Promise(async (resolve, reject) => {
              try {
                while (queryIterator.hasMoreResults()) {
                  const page = await queryIterator.fetchNext();
                  if (page.resources) {
                    headers.push(...page.resources);
                  }
                }
                resolve(headers);
              } catch (error) {
                reject(error);
              }
            });
            
            const result = await Promise.race([queryPromise, timeoutPromise]);
            headers = result as any[];
          } catch (timeoutError) {
            console.error('Database query timed out or failed:', timeoutError);
            headers = [];
          }
          
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