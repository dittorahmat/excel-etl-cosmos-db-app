import { Router } from 'express';
import type { Request, Response } from 'express';

import { AzureCosmosDB } from '../../types/azure.js';
import * as authMiddleware from '../../middleware/auth.js';

// Define types for internal use
interface ExcelRecord {
  [key: string]: string | number | boolean | null | undefined;
}

export function createFileQueryRouter(cosmosDb: AzureCosmosDB): Router {
  const router = Router();

  // Apply authentication middleware if enabled
  const authRequired = process.env.AUTH_ENABLED === 'true';

  /**
   * @openapi
   * /api/query/file:
   *   get:
   *     summary: Get data based on file and filters
   *     description: Returns all fields from the specified file with applied filters
   *     tags:
   *       - File Query
   *     parameters:
   *       - in: query
   *         name: fileId
   *         schema:
   *           type: string
   *         description: ID of the file to query from
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
   *         description: Filter by Year value (comma-separated for multiple years)
   *     responses:
   *       200:
   *         description: Data from the specified file with applied filters
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 type: object
   *                 additionalProperties:
   *                   type: any
   *       400:
   *         description: Missing fileId parameter
   *       500:
   *         description: Server error
   */
  router.get(
    '/file', 
    authRequired ? authMiddleware.authenticateToken : (req, res, next) => next(),
    async (req: Request, res: Response) => {
      const { fileId, limit, offset, ...filterParams } = req.query;
      
      if (!fileId) {
        return res.status(400).json({
          success: false,
          error: 'File ID parameter is required'
        });
      }

      try {
        console.log('File query endpoint hit - attempting to fetch data from Cosmos DB');
        console.log('File ID:', fileId);
        console.log('Limit:', limit);
        console.log('Offset:', offset);
        console.log('Filter parameters:', filterParams);
        
        // Get the container using the container method
        const container = await cosmosDb.container('excel-records', '/_partitionKey');

        // Build the base query with file ID and filters
        let baseWhereClause = "c.documentType = 'excel-row'";
        const filterConditions: string[] = [];

        // Add file ID condition - handle both single and multiple import prefixes
        const fileIdStr = String(fileId);
        const baseId = fileIdStr.replace(/^import_+/g, '');
        const possibleImportIds = [`import_${baseId}`];
        if (!fileIdStr.startsWith('import_import_')) {
          possibleImportIds.push(`import_${fileIdStr}`);
        }

        const importIdClauses = possibleImportIds.map((_, i) => `c._partitionKey = '${possibleImportIds[i]}'`);
        filterConditions.push(`(${importIdClauses.join(' OR ')})`);

        // First, handle regular filter parameters (Source, Category, Sub Category, Year)
        // Exclude limit, offset, and filters from these parameters
        for (const [filterField, filterValue] of Object.entries(filterParams)) {
          if (['fileId', 'limit', 'offset', 'filters'].includes(filterField)) continue; // Skip these parameters since we handle them separately

          if (filterValue !== undefined && filterValue !== null && filterValue !== '') {
            // Clean the filter field name to prevent injection - allow letters, numbers, spaces, underscores, hyphens, and forward slashes
            const cleanFilterField = String(filterField).replace(/[^a-zA-Z0-9 _/-]/g, '');

            // Check if this is a numeric field (like Year)
            const isNumericField = cleanFilterField.toLowerCase().includes('year');

            // Handle multi-value filters like Year (comma-separated)
            if (Array.isArray(filterValue)) {
              if (isNumericField) {
                // For numeric fields, don't wrap values in quotes
                const values = filterValue.map(v => {
                  const numValue = Number(v);
                  return isNaN(numValue) ? `'${String(v).replace(/'/g, "\\'")}'` : numValue;
                });
                if (values.length > 0) {
                  filterConditions.push(`c["${cleanFilterField}"] IN (${values.join(',')})`);
                }
              } else {
                // For string fields, wrap values in quotes
                const values = filterValue.map(v => String(v).replace(/'/g, "\\'"));
                if (values.length > 0) {
                  filterConditions.push(`c["${cleanFilterField}"] IN (${values.map(v => `'${v}'`).join(',')})`);
                }
              }
            } else if (typeof filterValue === 'string' && filterValue.includes(',')) {
              // Handle comma-separated values in a single string
              const values = filterValue.split(',').map(v => v.trim());
              if (isNumericField) {
                // For numeric fields, don't wrap values in quotes
                const numericValues = values.map(v => {
                  const numValue = Number(v);
                  return isNaN(numValue) ? `'${v.replace(/'/g, "\\'")}'` : numValue;
                });
                if (numericValues.length > 0) {
                  filterConditions.push(`c["${cleanFilterField}"] IN (${numericValues.join(',')})`);
                }
              } else {
                // For string fields, wrap values in quotes
                const stringValues = values.map(v => v.replace(/'/g, "\\'"));
                if (stringValues.length > 0) {
                  filterConditions.push(`c["${cleanFilterField}"] IN (${stringValues.map(v => `'${v}'`).join(',')})`);
                }
              }
            } else {
              if (isNumericField) {
                // For numeric fields, don't wrap the value in quotes
                const numValue = Number(filterValue);
                if (!isNaN(numValue)) {
                  filterConditions.push(`c["${cleanFilterField}"] = ${numValue}`);
                } else {
                  // If it's not numeric, treat as string
                  const cleanFilterValue = String(filterValue).replace(/'/g, "\\'");
                  filterConditions.push(`c["${cleanFilterField}"] = '${cleanFilterValue}'`);
                }
              } else {
                // For string fields, wrap value in quotes
                const cleanFilterValue = String(filterValue).replace(/'/g, "\\'");
                filterConditions.push(`c["${cleanFilterField}"] = '${cleanFilterValue}'`);
              }
            }
          }
        }

        // Now process the filters parameter, which should be a JSON string containing additional filter conditions
        if (filterParams.filters) {
          try {
            // Parse the filters JSON string
            const filtersString = String(filterParams.filters);
            const filtersArray = JSON.parse(filtersString) as Array<{field: string, operator: string, value: string | number | boolean, value2?: string | number | boolean}>;

            // Add each filter from the array to the query conditions
            for (const filter of filtersArray) {
              if (filter.field && filter.operator && filter.value !== undefined) {
                // Clean field name to prevent injection - allow letters, numbers, spaces, underscores, hyphens, and forward slashes
                const cleanField = String(filter.field).replace(/[^a-zA-Z0-9 _/-]/g, '');

                // Determine if value is numeric to decide whether to quote it
                const isNumericValue = typeof filter.value === 'number';
                const isSecondValueNumeric = typeof filter.value2 === 'number';

                // Safely convert values to string for injection protection if they are strings
                const safeValue = isNumericValue ? filter.value : String(filter.value).replace(/'/g, "\\'");
                const safeValue2 = filter.value2 !== undefined ? (isSecondValueNumeric ? filter.value2 : String(filter.value2).replace(/'/g, "\\'")) : undefined;

                // Apply the operator and value
                switch (filter.operator) {
                  case '=':
                  case '==':
                    filterConditions.push(`c["${cleanField}"] = ${isNumericValue ? safeValue : `'${safeValue}'`}`);
                    break;
                  case '!=':
                  case '<>':
                    filterConditions.push(`c["${cleanField}"] != ${isNumericValue ? safeValue : `'${safeValue}'`}`);
                    break;
                  case '>':
                    filterConditions.push(`c["${cleanField}"] > ${isNumericValue ? safeValue : `'${safeValue}'`}`);
                    break;
                  case '>=':
                    filterConditions.push(`c["${cleanField}"] >= ${isNumericValue ? safeValue : `'${safeValue}'`}`);
                    break;
                  case '<':
                    filterConditions.push(`c["${cleanField}"] < ${isNumericValue ? safeValue : `'${safeValue}'`}`);
                    break;
                  case '<=':
                    filterConditions.push(`c["${cleanField}"] <= ${isNumericValue ? safeValue : `'${safeValue}'`}`);
                    break;
                  case 'like':
                  case 'contains':
                    // Use LIKE operator for string containment (partial match) - only for string values
                    filterConditions.push(`CONTAINS(c["${cleanField}"], '${safeValue}')`);
                    break;
                  case 'in':
                    // Handle 'in' operator for multiple values
                    // If safeValue is comma-separated, split it and create an IN clause
                    if (typeof safeValue === 'string' && safeValue.includes(',')) {
                      const values = safeValue.split(',').map(v => v.trim());
                      if (values.length > 0) {
                        const inValues = values.map(v => `'${v}'`).join(',');
                        filterConditions.push(`c["${cleanField}"] IN (${inValues})`);
                      }
                    } else {
                      // If it's a single value, just do an equality check
                      filterConditions.push(`c["${cleanField}"] = '${safeValue}'`);
                    }
                    break;
                  case 'notIn':
                    // Handle 'notIn' operator for multiple values
                    // If safeValue is comma-separated, split it and create a NOT IN clause
                    if (typeof safeValue === 'string' && safeValue.includes(',')) {
                      const values = safeValue.split(',').map(v => v.trim());
                      if (values.length > 0) {
                        const inValues = values.map(v => `'${v}'`).join(',');
                        filterConditions.push(`c["${cleanField}"] NOT IN (${inValues})`);
                      }
                    } else {
                      // If it's a single value, just do a not equals check
                      filterConditions.push(`c["${cleanField}"] != '${safeValue}'`);
                    }
                    break;
                  case 'between':
                    if (filter.value2 !== undefined && safeValue2 !== undefined) {
                      filterConditions.push(`c["${cleanField}"] BETWEEN ${isNumericValue ? safeValue : `'${safeValue}'`} AND ${isSecondValueNumeric ? safeValue2 : `'${safeValue2}'`}`);
                    } else {
                      console.warn(`'between' operator requires value2 for field ${cleanField}`);
                    }
                    break;
                  default:
                    // Treat unknown operators as equality
                    filterConditions.push(`c["${cleanField}"] = ${isNumericValue ? safeValue : `'${safeValue}'`}`);
                    break;
                }
              }
            }
          } catch (parseError) {
            console.error('Error parsing filters parameter:', parseError);
            // Continue without filters if parsing fails
          }
        }

        // Add all filter conditions to the WHERE clause
        if (filterConditions.length > 0) {
          baseWhereClause += ` AND ${filterConditions.join(' AND ')}`;
        }

        // Build the query to get all fields (without specifying particular fields to get all)
        // Adjust the query to incorporate limit and offset as part of the query for server-side pagination
        let query = `SELECT * FROM c WHERE ${baseWhereClause}`;
        
        // Add ORDER BY to make pagination consistent
        query += ' ORDER BY c._ts';
        
        // Add OFFSET and LIMIT to the query for server-side pagination
        if (offset !== undefined) {
          query += ` OFFSET ${parseInt(String(offset), 10)} `;
        }
        
        if (limit !== undefined) {
          query += ` LIMIT ${parseInt(String(limit), 10)} `;
        } else if (offset !== undefined) {
          // If we have an offset but no limit, use a default limit
          query += ' LIMIT 100 ';
        }
        
        console.log(`Executing file query:`, query);

        // Use iterator instead of fetchAll to avoid loading all results into memory
        const queryIterator = container.items.query(query);
        const items: ExcelRecord[] = [];

        while (queryIterator.hasMoreResults()) {
          const response = await queryIterator.fetchNext();
          if (response.resources) {
            for (const item of response.resources) {
              // Filter out Cosmos DB metadata fields
              const filteredItem: ExcelRecord = {};
              for (const [key, value] of Object.entries(item)) {
                // Skip all Cosmos DB system properties and metadata
                if (!key.startsWith('_') && 
                    key !== 'id' && 
                    key !== 'documentType') {
                  filteredItem[key] = value as string | number | boolean | null | undefined;
                }
              }
              items.push(filteredItem);
            }
          }
        }

        console.log(`File query returned ${items.length} records`);

        return res.status(200).json(items);
      } catch (error) {
        console.error('Error fetching data from Cosmos DB for file query:', error);
        
        return res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );

  /**
   * @openapi
   * /api/query/file-get:
   *   get:
   *     summary: Get data based on file and filters (GET endpoint for API links)
   *     description: Returns all fields from the specified file with applied filters - designed for API link generation
   *     tags:
   *       - File Query
   *     parameters:
   *       - in: query
   *         name: fileId
   *         schema:
   *           type: string
   *         description: ID of the file to query from
   *       - in: query
   *         name: token
   *         schema:
   *           type: string
   *         description: Authentication token for API access
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
   *         description: Filter by Year value (comma-separated for multiple years)
   *     responses:
   *       200:
   *         description: Data from the specified file with applied filters
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 type: object
   *                 additionalProperties:
   *                   type: any
   *       400:
   *         description: Missing fileId parameter
   *       500:
   *         description: Server error
   */
  router.get(
    '/file-get',
    authRequired ? authMiddleware.authenticateTokenFromUrl : (req, res, next) => next(),
    async (req: Request, res: Response) => {
      const { fileId, limit, offset, ...filterParams } = req.query;
      
      if (!fileId) {
        return res.status(400).json({
          success: false,
          error: 'File ID parameter is required'
        });
      }

      try {
        console.log('File query GET endpoint hit - attempting to fetch data from Cosmos DB');
        console.log('File ID:', fileId);
        console.log('Limit:', limit);
        console.log('Offset:', offset);
        console.log('Filter parameters:', filterParams);
        
        // Get the container using the container method
        const container = await cosmosDb.container('excel-records', '/_partitionKey');

        // Build the base query with file ID and filters
        let baseWhereClause = "c.documentType = 'excel-row'";
        const filterConditions: string[] = [];

        // Add file ID condition - handle both single and multiple import prefixes
        const fileIdStr = String(fileId);
        const baseId = fileIdStr.replace(/^import_+/g, '');
        const possibleImportIds = [`import_${baseId}`];
        if (!fileIdStr.startsWith('import_import_')) {
          possibleImportIds.push(`import_${fileIdStr}`);
        }

        const importIdClauses = possibleImportIds.map((_, i) => `c._partitionKey = '${possibleImportIds[i]}'`);
        filterConditions.push(`(${importIdClauses.join(' OR ')})`);

        // First, handle regular filter parameters (Source, Category, Sub Category, Year)
        // Exclude token, limit, offset, and filters from these parameters
        for (const [filterField, filterValue] of Object.entries(filterParams)) {
          if (['fileId', 'token', 'limit', 'offset', 'filters'].includes(filterField)) continue; // Skip these parameters since we handle them separately

          if (filterValue !== undefined && filterValue !== null && filterValue !== '') {
            // Clean the filter field name to prevent injection - allow letters, numbers, spaces, underscores, hyphens, and forward slashes
            const cleanFilterField = String(filterField).replace(/[^a-zA-Z0-9 _/-]/g, '');

            // Check if this is a numeric field (like Year)
            const isNumericField = cleanFilterField.toLowerCase().includes('year');

            // Handle multi-value filters like Year (comma-separated)
            if (Array.isArray(filterValue)) {
              if (isNumericField) {
                // For numeric fields, don't wrap values in quotes
                const values = filterValue.map(v => {
                  const numValue = Number(v);
                  return isNaN(numValue) ? `'${String(v).replace(/'/g, "\\'")}'` : numValue;
                });
                if (values.length > 0) {
                  filterConditions.push(`c["${cleanFilterField}"] IN (${values.join(',')})`);
                }
              } else {
                // For string fields, wrap values in quotes
                const values = filterValue.map(v => String(v).replace(/'/g, "\\'"));
                if (values.length > 0) {
                  filterConditions.push(`c["${cleanFilterField}"] IN (${values.map(v => `'${v}'`).join(',')})`);
                }
              }
            } else if (typeof filterValue === 'string' && filterValue.includes(',')) {
              // Handle comma-separated values in a single string
              const values = filterValue.split(',').map(v => v.trim());
              if (isNumericField) {
                // For numeric fields, don't wrap values in quotes
                const numericValues = values.map(v => {
                  const numValue = Number(v);
                  return isNaN(numValue) ? `'${v.replace(/'/g, "\\'")}'` : numValue;
                });
                if (numericValues.length > 0) {
                  filterConditions.push(`c["${cleanFilterField}"] IN (${numericValues.join(',')})`);
                }
              } else {
                // For string fields, wrap values in quotes
                const stringValues = values.map(v => v.replace(/'/g, "\\'"));
                if (stringValues.length > 0) {
                  filterConditions.push(`c["${cleanFilterField}"] IN (${stringValues.map(v => `'${v}'`).join(',')})`);
                }
              }
            } else {
              if (isNumericField) {
                // For numeric fields, don't wrap the value in quotes
                const numValue = Number(filterValue);
                if (!isNaN(numValue)) {
                  filterConditions.push(`c["${cleanFilterField}"] = ${numValue}`);
                } else {
                  // If it's not numeric, treat as string
                  const cleanFilterValue = String(filterValue).replace(/'/g, "\\'");
                  filterConditions.push(`c["${cleanFilterField}"] = '${cleanFilterValue}'`);
                }
              } else {
                // For string fields, wrap value in quotes
                const cleanFilterValue = String(filterValue).replace(/'/g, "\\'");
                filterConditions.push(`c["${cleanFilterField}"] = '${cleanFilterValue}'`);
              }
            }
          }
        }

        // Now process the filters parameter, which should be a JSON string containing additional filter conditions
        if (filterParams.filters) {
          try {
            // Parse the filters JSON string
            const filtersString = String(filterParams.filters);
            const filtersArray = JSON.parse(filtersString) as Array<{field: string, operator: string, value: string | number | boolean, value2?: string | number | boolean}>;

            // Add each filter from the array to the query conditions
            for (const filter of filtersArray) {
              if (filter.field && filter.operator && filter.value !== undefined) {
                // Clean field name to prevent injection - allow letters, numbers, spaces, underscores, hyphens, and forward slashes
                const cleanField = String(filter.field).replace(/[^a-zA-Z0-9 _/-]/g, '');

                // Determine if value is numeric to decide whether to quote it
                const isNumericValue = typeof filter.value === 'number';
                const isSecondValueNumeric = typeof filter.value2 === 'number';

                // Safely convert values to string for injection protection if they are strings
                const safeValue = isNumericValue ? filter.value : String(filter.value).replace(/'/g, "\\'");
                const safeValue2 = filter.value2 !== undefined ? (isSecondValueNumeric ? filter.value2 : String(filter.value2).replace(/'/g, "\\'")) : undefined;

                // Apply the operator and value
                switch (filter.operator) {
                  case '=':
                  case '==':
                    filterConditions.push(`c["${cleanField}"] = ${isNumericValue ? safeValue : `'${safeValue}'`}`);
                    break;
                  case '!=':
                  case '<>':
                    filterConditions.push(`c["${cleanField}"] != ${isNumericValue ? safeValue : `'${safeValue}'`}`);
                    break;
                  case '>':
                    filterConditions.push(`c["${cleanField}"] > ${isNumericValue ? safeValue : `'${safeValue}'`}`);
                    break;
                  case '>=':
                    filterConditions.push(`c["${cleanField}"] >= ${isNumericValue ? safeValue : `'${safeValue}'`}`);
                    break;
                  case '<':
                    filterConditions.push(`c["${cleanField}"] < ${isNumericValue ? safeValue : `'${safeValue}'`}`);
                    break;
                  case '<=':
                    filterConditions.push(`c["${cleanField}"] <= ${isNumericValue ? safeValue : `'${safeValue}'`}`);
                    break;
                  case 'like':
                  case 'contains':
                    // Use LIKE operator for string containment (partial match) - only for string values
                    filterConditions.push(`CONTAINS(c["${cleanField}"], '${safeValue}')`);
                    break;
                  case 'in':
                    // Handle 'in' operator for multiple values
                    // If safeValue is comma-separated, split it and create an IN clause
                    if (typeof safeValue === 'string' && safeValue.includes(',')) {
                      const values = safeValue.split(',').map(v => v.trim());
                      if (values.length > 0) {
                        const inValues = values.map(v => `'${v}'`).join(',');
                        filterConditions.push(`c["${cleanField}"] IN (${inValues})`);
                      }
                    } else {
                      // If it's a single value, just do an equality check
                      filterConditions.push(`c["${cleanField}"] = '${safeValue}'`);
                    }
                    break;
                  case 'notIn':
                    // Handle 'notIn' operator for multiple values
                    // If safeValue is comma-separated, split it and create a NOT IN clause
                    if (typeof safeValue === 'string' && safeValue.includes(',')) {
                      const values = safeValue.split(',').map(v => v.trim());
                      if (values.length > 0) {
                        const inValues = values.map(v => `'${v}'`).join(',');
                        filterConditions.push(`c["${cleanField}"] NOT IN (${inValues})`);
                      }
                    } else {
                      // If it's a single value, just do a not equals check
                      filterConditions.push(`c["${cleanField}"] != '${safeValue}'`);
                    }
                    break;
                  case 'between':
                    if (filter.value2 !== undefined && safeValue2 !== undefined) {
                      filterConditions.push(`c["${cleanField}"] BETWEEN ${isNumericValue ? safeValue : `'${safeValue}'`} AND ${isSecondValueNumeric ? safeValue2 : `'${safeValue2}'`}`);
                    } else {
                      console.warn(`'between' operator requires value2 for field ${cleanField}`);
                    }
                    break;
                  default:
                    // Treat unknown operators as equality
                    filterConditions.push(`c["${cleanField}"] = ${isNumericValue ? safeValue : `'${safeValue}'`}`);
                    break;
                }
              }
            }
          } catch (parseError) {
            console.error('Error parsing filters parameter:', parseError);
            // Continue without filters if parsing fails
          }
        }

        // Add all filter conditions to the WHERE clause
        if (filterConditions.length > 0) {
          baseWhereClause += ` AND ${filterConditions.join(' AND ')}`;
        }

        // Build the query to get all fields (without specifying particular fields to get all)
        // Adjust the query to incorporate limit and offset as part of the query for server-side pagination
        let query = `SELECT * FROM c WHERE ${baseWhereClause}`;
        
        // Add ORDER BY to make pagination consistent
        query += ' ORDER BY c._ts';
        
        // Add OFFSET and LIMIT to the query for server-side pagination
        if (offset !== undefined) {
          query += ` OFFSET ${parseInt(String(offset), 10)} `;
        }
        
        if (limit !== undefined) {
          query += ` LIMIT ${parseInt(String(limit), 10)} `;
        } else if (offset !== undefined) {
          // If we have an offset but no limit, use a default limit
          query += ' LIMIT 100 ';
        }
        
        console.log(`Executing file query GET:`, query);

        // Use iterator instead of fetchAll to avoid loading all results into memory
        const queryIterator = container.items.query(query);
        const items: ExcelRecord[] = [];

        while (queryIterator.hasMoreResults()) {
          const response = await queryIterator.fetchNext();
          if (response.resources) {
            for (const item of response.resources) {
              // Filter out Cosmos DB metadata fields
              const filteredItem: ExcelRecord = {};
              for (const [key, value] of Object.entries(item)) {
                // Skip all Cosmos DB system properties and metadata
                if (!key.startsWith('_') && 
                    key !== 'id' && 
                    key !== 'documentType') {
                  filteredItem[key] = value as string | number | boolean | null | undefined;
                }
              }
              items.push(filteredItem);
            }
          }
        }

        console.log(`File query GET returned ${items.length} records`);

        return res.status(200).json(items);
      } catch (error) {
        console.error('Error fetching data from Cosmos DB for file query GET:', error);
        
        return res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );

  /**
   * @openapi
   * /api/query/distinct-file-values:
   *   get:
   *     summary: Get distinct values for specified fields based on file and filters
   *     description: Returns distinct values for the requested fields from the excel-records collection, optionally filtered by file and other field values
   *     tags:
   *       - File Query
   *     parameters:
   *       - in: query
   *         name: fields
   *         schema:
   *           type: string
   *         description: Comma-separated list of field names to get distinct values for
   *       - in: query
   *         name: fileId
   *         schema:
   *           type: string
   *         description: ID of the file to filter from (optional, if not provided, filters all data)
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
    '/distinct-file-values',
    authRequired ? authMiddleware.authenticateToken : (req, res, next) => next(),
    async (req: Request, res: Response) => {
      const { fields, fileId, ...filterParams } = req.query;
      
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
        console.log('Distinct file values endpoint hit - attempting to fetch distinct values from Cosmos DB');
        console.log('File ID:', fileId);
        console.log('Filter parameters:', filterParams);
        
        // Get the container using the container method
        const container = await cosmosDb.container('excel-records', '/_partitionKey');

        // Build the base query with filters
        let baseWhereClause = "c.documentType = 'excel-row'";
        const filterConditions: string[] = [];

        // Add file ID condition if provided - handle both single and multiple import prefixes
        if (fileId) {
          const fileIdStr = String(fileId);
          const baseId = fileIdStr.replace(/^import_+/g, '');
          const possibleImportIds = [`import_${baseId}`];
          if (!fileIdStr.startsWith('import_import_')) {
            possibleImportIds.push(`import_${fileIdStr}`);
          }

          const importIdClauses = possibleImportIds.map((_, i) => `c._partitionKey = '${possibleImportIds[i]}'`);
          filterConditions.push(`(${importIdClauses.join(' OR ')})`);
        }

        // Add filter conditions for each provided filter parameter (Source, Category, Sub Category, Year)
        for (const [filterField, filterValue] of Object.entries(filterParams)) {
          if (['fields', 'fileId'].includes(filterField)) continue; // Skip fields and fileId parameters

          if (filterValue !== undefined && filterValue !== null && filterValue !== '') {
            // Clean the filter field name to prevent injection - allow letters, numbers, spaces, underscores, hyphens, and forward slashes
            const cleanFilterField = String(filterField).replace(/[^a-zA-Z0-9 _/-]/g, '');

            // Check if this is a numeric field (like Year)
            const isNumericField = cleanFilterField.toLowerCase().includes('year');
            
            // Handle multi-value filters like Year (comma-separated)
            if (Array.isArray(filterValue)) {
              if (isNumericField) {
                // For numeric fields, don't wrap values in quotes
                const values = filterValue.map(v => {
                  const numValue = Number(v);
                  return isNaN(numValue) ? `'${String(v).replace(/'/g, "\\'")}'` : numValue;
                });
                if (values.length > 0) {
                  filterConditions.push(`c["${cleanFilterField}"] IN (${values.join(',')})`);
                }
              } else {
                // For string fields, wrap values in quotes
                const values = filterValue.map(v => String(v).replace(/'/g, "\\'"));
                if (values.length > 0) {
                  filterConditions.push(`c["${cleanFilterField}"] IN (${values.map(v => `'${v}'`).join(',')})`);
                }
              }
            } else if (typeof filterValue === 'string' && filterValue.includes(',')) {
              // Handle comma-separated values in a single string
              const values = filterValue.split(',').map(v => v.trim());
              if (isNumericField) {
                // For numeric fields, don't wrap values in quotes
                const numericValues = values.map(v => {
                  const numValue = Number(v);
                  return isNaN(numValue) ? `'${v.replace(/'/g, "\\'")}'` : numValue;
                });
                if (numericValues.length > 0) {
                  filterConditions.push(`c["${cleanFilterField}"] IN (${numericValues.join(',')})`);
                }
              } else {
                // For string fields, wrap values in quotes
                const stringValues = values.map(v => v.replace(/'/g, "\\'"));
                if (stringValues.length > 0) {
                  filterConditions.push(`c["${cleanFilterField}"] IN (${stringValues.map(v => `'${v}'`).join(',')})`);
                }
              }
            } else {
              if (isNumericField) {
                // For numeric fields, don't wrap the value in quotes
                const numValue = Number(filterValue);
                if (!isNaN(numValue)) {
                  filterConditions.push(`c["${cleanFilterField}"] = ${numValue}`);
                } else {
                  // If it's not numeric, treat as string
                  const cleanFilterValue = String(filterValue).replace(/'/g, "\\'");
                  filterConditions.push(`c["${cleanFilterField}"] = '${cleanFilterValue}'`);
                }
              } else {
                // For string fields, wrap value in quotes
                const cleanFilterValue = String(filterValue).replace(/'/g, "\\'");
                filterConditions.push(`c["${cleanFilterField}"] = '${cleanFilterValue}'`);
              }
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
            const response = await queryIterator.fetchNext();
            if (response.resources) {
              values.push(...response.resources);
            }
          }

          // Filter out null, undefined, and empty string values
          distinctValues[cleanField] = values.filter((value: string | number | boolean) =>
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

        return res.status(200).json({
          success: true,
          values: distinctValues
        });
      } catch (error) {
        console.error('Error fetching distinct file values from Cosmos DB:', error);
        
        return res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );

  /**
   * @openapi
   * /api/query/files-by-filters:
   *   get:
   *     summary: Get files that contain data matching the specified filters
   *     description: Returns files that have data records matching the provided Source, Category, Sub Category filters
   *     tags:
   *       - File Query
   *     parameters:
   *       - in: query
   *         name: Source
   *         schema:
   *           type: string
   *         description: Filter files by Source value
   *       - in: query
   *         name: Category
   *         schema:
   *           type: string
   *         description: Filter files by Category value
   *       - in: query
   *         name: Sub Category
   *         schema:
   *           type: string
   *         description: Filter files by Sub Category value
   *       - in: query
   *         name: Year
   *         schema:
   *           type: string
   *         description: Filter files by Year value (comma-separated for multiple years)
   *       - in: query
   *         name: page
   *         schema:
   *           type: number
   *         description: Page number for pagination (default: 1)
   *       - in: query
   *         name: pageSize
   *         schema:
   *           type: number
   *         description: Number of items per page (default: 1000)
   *     responses:
   *       200:
   *         description: Files that contain data matching the specified filters
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     items:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           id:
   *                             type: string
   *                           fileName:
   *                             type: string
   *                           processedAt:
   *                             type: string
   *                           blobUrl:
   *                             type: string
   *                           totalRows:
   *                             type: number
   *                           fileSize:
   *                             type: number
   *                     total:
   *                       type: number
   *                     page:
   *                       type: number
   *                     pageSize:
   *                       type: number
   *                     totalPages:
   *                       type: number
   *       400:
   *         description: Invalid parameters
   *       500:
   *         description: Server error
   */
  router.get(
    '/files-by-filters',
    authRequired ? authMiddleware.authenticateToken : (req, res, next) => next(),
    async (req: Request, res: Response) => {
      const { 
        Source, 
        Category, 
        'Sub Category': SubCategory, 
        Year, 
        page = '1', 
        pageSize = '1000' 
      } = req.query;
      
      try {
        console.log('Files by filters endpoint hit - attempting to fetch files from Cosmos DB');
        console.log('Filter parameters:', { Source, Category, SubCategory, Year });
        
        // Get the container using the container method
        const container = await cosmosDb.container('excel-records', '/_partitionKey');

        // First, find all unique _importId values that match the filter criteria
        let baseWhereClause = "c.documentType = 'excel-row'";
        const filterConditions: string[] = [];

        // Add filter conditions
        if (Source) {
          const cleanSource = String(Source).replace(/'/g, "\\'");
          filterConditions.push(`c["Source"] = '${cleanSource}'`);
        }
        if (Category) {
          const cleanCategory = String(Category).replace(/'/g, "\\'");
          filterConditions.push(`c["Category"] = '${cleanCategory}'`);
        }
        if (SubCategory) {
          const cleanSubCategory = String(SubCategory).replace(/'/g, "\\'");
          filterConditions.push(`c["Sub Category"] = '${cleanSubCategory}'`);
        }
        if (Year) {
          // Handle multiple years if provided as comma-separated values
          const years = Array.isArray(Year) ? Year : String(Year).split(',');
          const cleanYears = years.map(year => String(year).trim().replace(/'/g, "\\'"));
          if (cleanYears.length > 0) {
            filterConditions.push(`c["Year"] IN (${cleanYears.map(y => `'${y}'`).join(',')})`);
          }
        }

        if (filterConditions.length > 0) {
          baseWhereClause += ` AND ${filterConditions.join(' AND ')}`;
        }

        // Query to find unique _importId values that match the criteria
        const importIdQuery = `SELECT DISTINCT c._importId FROM c WHERE ${baseWhereClause}`;
        
        console.log('Import ID query:', importIdQuery);
        
        // Use iterator instead of fetchAll to avoid loading all results into memory
        const importIdQueryIterator = container.items.query(importIdQuery);
        const values: ExcelRecord[] = [];

        while (importIdQueryIterator.hasMoreResults()) {
          const response = await importIdQueryIterator.fetchNext();
          if (response.resources) {
            values.push(...response.resources);
          }
        }
        
        const matchingImportIds = values
          .map((r: ExcelRecord) => r._importId)
          .filter((id): id is string => typeof id === 'string' && id != null) as string[];

        console.log(`Found ${matchingImportIds.length} unique import IDs matching filters`);

        if (matchingImportIds.length === 0) {
          return res.status(200).json({
            success: true,
            data: {
              items: [],
              total: 0,
              page: parseInt(page as string, 10),
              pageSize: parseInt(pageSize as string, 10),
              totalPages: 0
            }
          });
        }

        // Now get the import metadata for these specific files
        // We need to query the imports container or look for import records
        // Since import records are stored with documentType: 'excel-import', we query those
        const importContainer = await cosmosDb.container('excel-records', '/_partitionKey');

        // Build the query for import records that match the found import IDs
        const importIdParams = matchingImportIds.map((_, i) => `c._importId = @importId${i}`);
        const importIdQueryParams = matchingImportIds.map((id, i) => ({ 
          name: `@importId${i}`, 
          value: id 
        }));

        const importsQuery = {
          query: `
            SELECT c.id, c.fileName, c.processedAt, c.blobUrl, c.totalRows, c.fileSize, c._importId
            FROM c 
            WHERE c.documentType = 'excel-import'
            AND (${importIdParams.join(' OR ')})
            ORDER BY c.processedAt DESC
          `,
          parameters: importIdQueryParams
        };

        console.log('Imports query:', importsQuery);

        // Use iterator instead of fetchAll to avoid loading all results into memory
        const importQueryIterator = importContainer.items.query(importsQuery);
        const importItems: ExcelRecord[] = [];

        while (importQueryIterator.hasMoreResults()) {
          const response = await importQueryIterator.fetchNext();
          if (response.resources) {
            importItems.push(...response.resources);
          }
        }

        console.log(`Found ${importItems.length} import records matching the IDs`);

        // Apply pagination
        const pageNum = parseInt(page as string, 10) || 1;
        const pageSizeNum = parseInt(pageSize as string, 10) || 1000;
        const startIndex = (pageNum - 1) * pageSizeNum;
        const endIndex = startIndex + pageSizeNum;
        const paginatedItems = importItems.slice(startIndex, endIndex);
        const total = importItems.length;
        const totalPages = Math.ceil(total / pageSizeNum);

        return res.status(200).json({
          success: true,
          data: {
            items: paginatedItems,
            total,
            page: pageNum,
            pageSize: pageSizeNum,
            totalPages
          }
        });
      } catch (error) {
        console.error('Error fetching files by filters from Cosmos DB:', error);
        
        return res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          message: 'Error fetching files by filters'
        });
      }
    }
  );

  return router;
}
