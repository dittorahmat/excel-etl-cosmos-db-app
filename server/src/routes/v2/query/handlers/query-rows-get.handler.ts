import { Request, Response } from 'express';
import { BaseQueryHandler } from './base.handler.js';
import { getOrInitializeCosmosDB } from '../../../../services/cosmos-db/cosmos-db.service.js';
import { FilterCondition } from '@common/types/filter-condition.js';

/**
 * Handler for querying exactly Name, Email, Phone fields, mimicking the Cosmos DB query:
 * SELECT c.Name, c.Email, c.Phone FROM c WHERE IS_DEFINED(c.Name) AND IS_DEFINED(c.Email) AND IS_DEFINED(c.Phone) AND c.documentType = 'excel-row'
 */
export class QueryRowsGetHandler extends BaseQueryHandler {
  constructor() {
    super('excel-records', '/_partitionKey');
  }

  public async handle(req: Request, res: Response): Promise<Response | void> {
    const logContext = { requestId: Math.random().toString(36).substring(2, 9) };
    const log = (message: string, data?: unknown) => {
      console.log(`[${new Date().toISOString()}] [${logContext.requestId}] ${message}`, data || '');
    };
    
    // Log raw request info
    log('Raw request info:', {
      method: req.method,
      url: req.url,
      headers: req.headers,
      query: req.query,
      queryType: typeof req.query,
      queryKeys: Object.keys(req.query || {})
    });
    
    try {
      log('Received request', {
        method: req.method,
        url: req.url,
        headers: req.headers,
        query: req.query
      });
      
      // Only allow GET
      if (req.method !== 'GET') {
        log(`Method not allowed: ${req.method}`);
        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
      }
      
      const fields = req.query.fields ? (req.query.fields as string).split(',') : [];
      let filters: FilterCondition[] = [];
      if (req.query.filters) {
        try {
          filters = JSON.parse(decodeURIComponent(req.query.filters as string));
        } catch (e) {
          log('Error parsing filters', { error: e, filters: req.query.filters });
          return res.status(400).json({ success: false, message: 'Invalid filters parameter' });
        }
      }
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
      const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
      
      log('Request query parsed', {
        fields,
        limit,
        offset,
        fieldsType: Array.isArray(fields) ? 'array' : typeof fields,
        fieldsLength: Array.isArray(fields) ? fields.length : 'not an array',
        queryKeys: Object.keys(req.query)
      });
      
      // Validate fields parameter
      if (!Array.isArray(fields)) {
        log('Fields is not an array', { fields });
        return res.status(400).json({ 
          success: false, 
          message: 'Fields must be an array of field names',
          receivedType: Array.isArray(fields) ? 'array' : typeof fields,
          receivedValue: fields
        });
      }
      
      if (fields.length === 0) {
        log('Empty fields array received');
        return res.status(400).json({ 
          success: false, 
          message: 'Fields array must contain at least one field' 
        });
      }
      
      // Ensure all fields are valid strings
      const invalidFields = fields.filter(field => typeof field !== 'string' || field.trim().length === 0);
      if (invalidFields.length > 0) {
        log('Invalid fields found', { invalidFields });
        return res.status(400).json({ 
          success: false, 
          message: 'All fields must be non-empty strings',
          invalidFields
        });
      }

      const cosmosDb = await getOrInitializeCosmosDB();
      log('Initializing Cosmos DB container', { containerName: this.containerName, partitionKey: this.partitionKey });
      const container = await cosmosDb.container(this.containerName, this.partitionKey);

      // Build the field selection part of the query
      // Build field selections and conditions with proper parameterization
      const fieldSelections = fields.map(field => `c["${field}"]`).join(', ');
      
      // Create parameters for each field in the WHERE clause
      const fieldConditions = fields.map(field => `IS_DEFINED(c["${field}"])`).join(' AND ');

      // Build filter conditions
      const filterConditions = filters.map((filter, index) => {
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

      const filterParameters = filters.flatMap((filter, index) => {
        const params = [{ name: `@filterValue${index}`, value: filter.value }];
        if (filter.operator === 'between') {
          params.push({ name: `@filterValue2_${index}`, value: filter.value2 ?? null });
        }
        return params;
      });

      const whereClause = [fieldConditions, filterConditions].filter(Boolean).join(' AND ');
      
      // Build the exact query with dynamic fields
      const query = {
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

      log('Executing Cosmos DB data query', { 
        query: query.query, 
        parameters: query.parameters
      });

      log('Executing Cosmos DB count query', { 
        query: countQuery.query,
        parameters: countQuery.parameters
      });

      // Execute both queries in parallel
      let itemsResponse, countResponse;
      try {
        [itemsResponse, countResponse] = await Promise.all([
          container.items.query(query).fetchAll(),
          container.items.query(countQuery).fetchAll()
        ]);
        
        log('Cosmos DB queries executed successfully', {
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
            
        log('Error executing Cosmos DB queries', { 
          error: errorInfo,
          query: query.query,
          parameters: query.parameters
        });
        throw error; // Re-throw to be caught by the outer try-catch
      }

      const items = itemsResponse?.resources || [];
      const total = countResponse?.resources?.[0] || 0;
      
      log('Query results', { itemsCount: items.length, total });

      return res.status(200).json({
        success: true,
        items,
        total,
        hasMore: items.length < total - offset
      });
    } catch (error) {
      return this.handleError(error, res, logContext);
    }
  }
}

export const queryRowsGetHandler = new QueryRowsGetHandler();
