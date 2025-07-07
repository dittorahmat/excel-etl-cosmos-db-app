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

    logger.info('listImports - Starting request', { 
      ...logContext,
      method: req.method,
      url: req.originalUrl,
      query: req.query,
    });

    try {
      // Parse and validate query parameters
      logger.info('listImports - Parsing query parameters', logContext);
      const parseResult = queryParamsSchema.safeParse(req.query);
      
      if (!parseResult.success) {
        logger.error('listImports - Invalid query parameters', { 
          ...logContext,
          error: parseResult.error,
          issues: parseResult.error.issues 
        });
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid query parameters',
          issues: parseResult.error.issues 
        });
      }
      
      const queryParams = parseResult.data;
      logger.info('listImports - Parsed query parameters', { 
        ...logContext,
        queryParams 
      });

      // Define the import metadata type
      interface ImportMetadata {
        id: string;
        _importId: string;
        fileName: string;
        status: string;
        rowCount: number;
        createdAt: string;
        updatedAt: string;
        [key: string]: unknown; // Allow additional properties
      }

      // Prepare query parameters with continuation token
      const queryParamsWithContinuation = {
        ...queryParams,
        sort: queryParams.sort || '-createdAt', // Default sort by newest first
        filter: {
          ...(queryParams.filter || {}),
          documentType: 'excel-import' // Let the query builder handle this
        },
        continuationToken: queryParams.continuationToken
      } as QueryParams;

      // Get all imports (documentType filter is added by the query builder)
      const { 
        items: imports = [], 
        requestCharge: importsCharge,
        continuationToken,
        hasMoreResults
      } = await this.executeQuery<ImportMetadata>(queryParamsWithContinuation);

      // Ensure imports is an array
      const safeImports = Array.isArray(imports) ? imports : [];

      logger.info('listImports - Found imports', {
        ...logContext,
        importCount: safeImports.length,
        requestCharge: importsCharge,
        hasMoreResults,
        hasContinuationToken: !!continuationToken
      });

      // Get row counts for each import
      const importsWithRowCounts = await Promise.all(
        safeImports.map(async (imp) => {
          const { items: [rowCount] } = await this.executeQuery<number>(
            { limit: 1, offset: 0 },
            [
              'c._importId = @importId',
              'c.documentType = @rowDocumentType'
            ],
            [
              { name: '@importId', value: imp._importId },
              { name: '@rowDocumentType', value: 'excel-row' }
            ]
          );
          return {
            ...imp,
            rowCount: rowCount || 0,
          };
        })
      );

      // Ensure we have an array of imports with row counts
      const safeImportsWithRowCounts = Array.isArray(importsWithRowCounts) ? importsWithRowCounts : [];

      // Return the response with pagination info
      const response = {
        success: true,
        data: {
          items: safeImportsWithRowCounts,
          total: safeImportsWithRowCounts.length,
          page: queryParams.offset ? Math.floor(queryParams.offset / queryParams.limit) + 1 : 1,
          pageSize: queryParams.limit || safeImportsWithRowCounts.length,
          totalPages: queryParams.limit ? Math.ceil(safeImportsWithRowCounts.length / queryParams.limit) : 1,
        },
        pagination: {
          total: safeImportsWithRowCounts.length,
          limit: queryParams.limit || safeImportsWithRowCounts.length,
          offset: queryParams.offset || 0,
          ...(continuationToken && { continuationToken }),
          hasMoreResults: hasMoreResults || false
        },
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
