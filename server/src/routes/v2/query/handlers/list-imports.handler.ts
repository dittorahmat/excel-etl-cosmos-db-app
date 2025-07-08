import { Request, Response } from 'express';
import { logger } from '../../../../utils/logger.js';
import { BaseQueryHandler } from './base.handler.js';
import { queryParamsSchema } from '../schemas/query.schemas.js';
import { QueryParams } from '../types/query.types.js';



export class ListImportsHandler extends BaseQueryHandler {
  constructor() {
    super('excel-records', '/_partitionKey');
  }

  public async handle(req: Request, res: Response): Promise<Response | void> {
    const logContext = { requestId: Math.random().toString(36).substring(2, 9) };
    const isPostRequest = req.method === 'POST';

    logger.info('listImports - Starting request', { 
      ...logContext,
      method: req.method,
      url: req.originalUrl,
      query: isPostRequest ? 'POST body' : req.query,
    });

    try {
      // For POST requests, use the request body, otherwise use query parameters
      const inputParams = isPostRequest ? req.body : req.query;
      
      // Parse and validate parameters
      logger.info('listImports - Parsing parameters', { 
        ...logContext,
        source: isPostRequest ? 'body' : 'query',
        params: inputParams
      });
      
      const parseResult = queryParamsSchema.safeParse(inputParams);
      
      if (!parseResult.success) {
        logger.error('listImports - Invalid parameters', { 
          ...logContext,
          error: parseResult.error,
          issues: parseResult.error.issues 
        });
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid parameters',
          issues: parseResult.error.issues 
        });
      }
      
      const queryParams = parseResult.data;
      logger.info('listImports - Parsed query parameters', { 
        ...logContext,
        queryParams 
      });

      

      // Prepare query parameters with continuation token
      const queryParamsWithContinuation: QueryParams = {
        ...queryParams,
        sort: queryParams.sort || '-createdAt', // Default sort by newest first
        filter: {
          ...(queryParams.filter || {}),
          documentType: 'excel-import' // Let the query builder handle this
        },
        continuationToken: queryParams.continuationToken,
        fields: queryParams.fields ? queryParams.fields.join(',') : undefined
      };

      // Get the total count of matching documents
      const totalCount = await this.getTotalCount([], []);

      // Execute the query
      const { items, requestCharge, continuationToken, hasMoreResults } = 
        await this.executeQuery<Record<string, unknown>>(
          queryParamsWithContinuation,
          [],
          []
        );

      logger.info('listImports - Found imports', { 
        ...logContext,
        importCount: items.length,
        hasMoreResults,
        hasContinuationToken: !!continuationToken,
        requestCharge,
      });

      // If we have fields to select, we need to ensure we only return those fields
      const selectedFields = queryParams.fields && queryParams.fields.length > 0 
        ? queryParams.fields 
        : null;
      
      const processedItems = items.map(item => {
        // If no specific fields are requested, return the full item
        if (!selectedFields) {
          return item;
        }
        
        // Otherwise, only include the selected fields
        const result: Record<string, unknown> = {};
        selectedFields.forEach(field => {
          // Handle nested fields if needed (e.g., 'user.name')
          const fieldParts = field.split('.');
          let value: unknown = item;
          
          try {
            for (const part of fieldParts) {
              value = (value as Record<string, unknown>)[part];
              if (value === undefined) break;
            }
            // Only add the field if it exists in the document
            if (value !== undefined) {
              result[field] = value;
            }
          } catch (error) {
            // Skip fields that cause errors during access
            logger.debug(`Error accessing field ${field}`, { error, item });
          }
        });
        
        // Always include id and documentType fields if they exist
        if ('id' in item) result.id = item.id;
        if ('documentType' in item) result.documentType = item.documentType;
        
        return result;
      });

      // Calculate pagination info
      const pageSize = queryParams.limit || 100;
      const page = queryParams.offset ? Math.floor(queryParams.offset / pageSize) + 1 : 1;
      const totalPages = Math.ceil(totalCount / pageSize);

      logger.debug('listImports - Sending response', {
        ...logContext,
        itemCount: processedItems.length,
        totalCount,
        hasMoreResults,
        hasContinuationToken: !!continuationToken
      });

      // Prepare the response
      const response = {
        success: true,
        data: {
          items: processedItems,
          total: totalCount,
          page,
          pageSize,
          totalPages,
          fields: selectedFields || (processedItems.length > 0 ? Object.keys(processedItems[0]) : [])
        },
        pagination: {
          total: totalCount,
          limit: pageSize,
          offset: queryParams.offset || 0,
          hasMoreResults: hasMoreResults || false,
          ...(continuationToken && { continuationToken })
        }
      };

      logger.debug('listImports - Sending response', {
        ...logContext,
        itemCount: response.data.items.length,
        totalCount: response.data.total,
        hasMoreResults: response.pagination.hasMoreResults,
        hasContinuationToken: !!response.pagination.continuationToken
      });

      return res.status(200).json(response);
    } catch (error) {
      return this.handleError(error, res, logContext);
    }
  }
}

export const listImportsHandler = new ListImportsHandler();
