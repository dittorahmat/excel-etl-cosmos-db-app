import { Request, Response } from 'express';
import { BaseQueryHandler } from './base.handler.js';
import { AzureCosmosDB } from '../../../../types/azure.js';
import { FilterCondition } from '@common/types/filter-condition.js';
import { JoinProcessor } from '../utils/join-processor.js';

/**
 * Handler for querying exactly Name, Email, Phone fields, mimicking the Cosmos DB query:
 * SELECT c.Name, c.Email, c.Phone FROM c WHERE IS_DEFINED(c.Name) AND IS_DEFINED(c.Email) AND IS_DEFINED(c.Phone) AND c.documentType = 'excel-row'
 */
export class QueryRowsGetHandler extends BaseQueryHandler {

  constructor(cosmosDb: AzureCosmosDB) {
    super(cosmosDb, cosmosDb.database, 'excel-records', '/_partitionKey');
  }

  public async handle(req: Request, res: Response): Promise<Response | void> {
    const logContext = { requestId: Math.random().toString(36).substring(2, 9) };
    
    // Log raw request info
    console.log(`[${new Date().toISOString()}] [${logContext.requestId}] Raw request info:`, {
      method: req.method,
      url: req.url,
      headers: req.headers,
      query: req.query,
      queryType: typeof req.query,
      queryKeys: Object.keys(req.query || {})
    });
    
    try {
      console.log(`[${new Date().toISOString()}] [${logContext.requestId}] Received request`, {
        method: req.method,
        url: req.url,
        headers: req.headers,
        query: req.query
      });
      
      // Only allow GET
      if (req.method !== 'GET') {
        console.log(`[${new Date().toISOString()}] [${logContext.requestId}] Method not allowed: ${req.method}`);
        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
      }
      
      const fields = req.query.fields ? decodeURIComponent(req.query.fields as string).split(',') : [];
      // JOIN is now mandatory (always enabled)
      const enableJoin = true;
      let filters: FilterCondition[] = [];
      if (req.query.filters) {
        try {
          filters = JSON.parse(decodeURIComponent(req.query.filters as string));
        } catch (e) {
          console.log(`[${new Date().toISOString()}] [${logContext.requestId}] Error parsing filters`, { error: e, filters: req.query.filters });
          return res.status(400).json({ success: false, message: 'Invalid filters parameter' });
        }
      }
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100000;
      const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
      
      console.log(`[${new Date().toISOString()}] [${logContext.requestId}] Request query parsed`, {
        fields,
        enableJoin: true, // JOIN is now mandatory
        limit,
        offset,
        fieldsType: Array.isArray(fields) ? 'array' : typeof fields,
        fieldsLength: Array.isArray(fields) ? fields.length : 'not an array',
        queryKeys: Object.keys(req.query)
      });
      
      // Validate fields parameter
      if (!Array.isArray(fields)) {
        console.log(`[${new Date().toISOString()}] [${logContext.requestId}] Fields is not an array`, { fields });
        return res.status(400).json({ 
          success: false, 
          message: 'Fields must be an array of field names',
          receivedType: Array.isArray(fields) ? 'array' : typeof fields,
          receivedValue: fields
        });
      }
      
      if (fields.length === 0) {
        console.log(`[${new Date().toISOString()}] [${logContext.requestId}] Empty fields array received`);
        return res.status(400).json({ 
          success: false, 
          message: 'Fields array must contain at least one field' 
        });
      }
      
      // Ensure all fields are valid strings
      const invalidFields = fields.filter(field => typeof field !== 'string' || field.trim().length === 0);
      if (invalidFields.length > 0) {
        console.log(`[${new Date().toISOString()}] [${logContext.requestId}] Invalid fields found`, { invalidFields });
        return res.status(400).json({ 
          success: false, 
          message: 'All fields must be non-empty strings',
          invalidFields
        });
      }

      
      console.log(`[${new Date().toISOString()}] [${logContext.requestId}] Initializing Cosmos DB container`, { containerName: this.containerName, partitionKey: this.partitionKey });
      const container = await this.cosmosDb.container(this.containerName, this.partitionKey);

      const fieldsWithNoSanitization = fields; // No sanitization to preserve field names with spaces
      const filtersWithNoSanitization = filters; // No sanitization to preserve field names with spaces

      // Build the field selection part of the query
      // Build field selections and conditions with proper parameterization
      const fieldSelections = fieldsWithNoSanitization.map(field => `c["${field}"]`).join(', ');
      
      // For JOIN functionality, we only require special filter fields to be defined
      // This allows us to find all records that match the key combinations regardless of which specific data fields they have
      const specialFilterFields = ['Source', 'Category', 'Sub Category', 'Year'];
      const fieldConditions = specialFilterFields
        .filter(field => fieldsWithNoSanitization.includes(field))
        .map(field => `IS_DEFINED(c["${field}"])`)
        .join(' AND ') || 'c.documentType = @documentType';

      // Build filter conditions
      const filterConditions = filtersWithNoSanitization.map((filter, index) => {
        const paramName = `@filterValue${index}`;
        const paramName2 = `@filterValue2_${index}`;
        switch (filter.operator) {
          case '=':
            return `c["${filter.field}"] = ${paramName}`;
          case '!=':
            return `c["${filter.field}"] != ${paramName}`;
          case 'contains':
            return `CONTAINS(c["${filter.field}"], ${paramName})`;
          case 'startsWith':
            return `STARTSWITH(c["${filter.field}"], ${paramName})`;
          case 'endsWith':
            return `ENDSWITH(c["${filter.field}"], ${paramName})`;
          case '>':
            return `c["${filter.field}"] > ${paramName}`;
          case '>=':
            return `c["${filter.field}"] >= ${paramName}`;
          case '<':
            return `c["${filter.field}"] < ${paramName}`;
          case '<=':
            return `c["${filter.field}"] <= ${paramName}`;
          case 'between':
            return `(c["${filter.field}"] >= ${paramName} AND c["${filter.field}"] <= ${paramName2})`;
          case 'empty':
            return `(NOT IS_DEFINED(c["${filter.field}"]) OR c["${filter.field}"] = '' OR c["${filter.field}"] = null)`;
          case '!empty':
            return `(IS_DEFINED(c["${filter.field}"]) AND c["${filter.field}"] != '' AND c["${filter.field}"] != null)`;
          default:
            return '';
        }
      }).filter(Boolean).join(' AND ');

      const filterParameters = filtersWithNoSanitization.flatMap((filter, index) => {
        const params = [{ name: `@filterValue${index}`, value: filter.value }];
        if (filter.operator === 'between') {
          params.push({ name: `@filterValue2_${index}`, value: filter.value2 ?? null });
        }
        return params;
      });

      const whereClause = [fieldConditions, filterConditions].filter(Boolean).join(' AND ');
      
      // Build the exact query with dynamic fields
      let query = {
        query: `
          SELECT ${fieldSelections}
          FROM c 
          WHERE ${whereClause}
            AND c.documentType = @documentType
          OFFSET @offset LIMIT @limit
        `,
        parameters: [
          { name: '@documentType', value: 'excel-row' },
          ...filterParameters,
          { name: '@offset', value: offset },
          { name: '@limit', value: limit }
        ]
      };

      // For JOIN functionality, we need to get all matching records without the limit initially
      let joinQuery = query;
      if (enableJoin) {
        joinQuery = {
          query: `
            SELECT ${fieldSelections}
            FROM c 
            WHERE ${whereClause}
              AND c.documentType = @documentType
          `,
          parameters: [
            { name: '@documentType', value: 'excel-row' },
            ...filterParameters
          ]
        };
      }

      // Get total count with the same field conditions
      const countQuery = {
        query: `
          SELECT VALUE COUNT(1)
          FROM c 
          WHERE ${whereClause}
            AND c.documentType = @documentType
        `,
        parameters: [
          { name: '@documentType', value: 'excel-row' },
          ...filterParameters
        ]
      };

      console.log(`[${new Date().toISOString()}] [${logContext.requestId}] Executing Cosmos DB data query`, { 
        query: joinQuery.query, 
        parameters: joinQuery.parameters,
        enableJoin
      });

      console.log(`[${new Date().toISOString()}] [${logContext.requestId}] Executing Cosmos DB count query`, { 
        query: countQuery.query,
        parameters: countQuery.parameters
      });

      // Execute both queries in parallel
      let itemsResponse, countResponse;
      try {
        [itemsResponse, countResponse] = await Promise.all([
          container.items.query(joinQuery).fetchAll(),
          container.items.query(countQuery).fetchAll()
        ]);
        
        console.log(`[${new Date().toISOString()}] [${logContext.requestId}] Cosmos DB queries executed successfully`, { 
        itemsCount: itemsResponse?.resources?.length,
        totalCount: countResponse?.resources?.[0]
      });
      } catch (error) {
        const errorInfo = error instanceof Error 
          ? { 
              message: error.message, 
              stack: error.stack,
              name: error.name
            }
          : { 
              message: String(error),
              stack: undefined,
              name: 'UnknownError'
            };
            
        console.log(`[${new Date().toISOString()}] [${logContext.requestId}] Error executing Cosmos DB queries`, { 
          error: errorInfo,
          query: joinQuery.query,
          parameters: joinQuery.parameters
        });
        throw error; // Re-throw to be caught by the outer try-catch
      }

      let items = itemsResponse?.resources || [];
      const total = countResponse?.resources?.[0] || 0;
      
      // Apply JOIN processing if enabled
      if (enableJoin && items.length > 0) {
        console.log(`[${new Date().toISOString()}] [${logContext.requestId}] Applying JOIN processing to items`, { originalCount: items.length });
        const specialFilterFields = ['Source', 'Category', 'Sub Category', 'Year'];
        items = JoinProcessor.joinRecords(items, specialFilterFields);
        console.log(`[${new Date().toISOString()}] [${logContext.requestId}] JOIN processing completed`, { joinedCount: items.length });
      }

      // Apply offset and limit to the results after JOIN processing
      const startOffset = Math.min(offset, items.length);
      const endOffset = Math.min(offset + limit, items.length);
      const pagedItems = items.slice(startOffset, endOffset);
      
      console.log(`[${new Date().toISOString()}] [${logContext.requestId}] Query results`, { itemsCount: pagedItems.length, total, enableJoin });

      return res.status(200).json(pagedItems);
    } catch (error) {
      return this.handleError(error, res, logContext);
    }
  }
}
