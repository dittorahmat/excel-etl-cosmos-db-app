import { Request, Response } from 'express';
import { logger } from '../../../../utils/logger.js';
import { BaseQueryHandler } from './base.handler.js';
import { AzureCosmosDB } from '../../../../types/azure.js';
import { queryParamsSchema } from '../schemas/query.schemas.js';

export class QueryAllRowsHandler extends BaseQueryHandler {
  constructor(cosmosDb: AzureCosmosDB) {
    super(cosmosDb, 'excel-records', '/_partitionKey');
  }

  public async handle(req: Request, res: Response): Promise<Response | void> {
    const logContext = { requestId: Math.random().toString(36).substring(2, 9) };

    logger.info('queryAllRows - Starting request', { 
      ...logContext,
      method: req.method,
      url: req.originalUrl,
      query: req.query,
    });

    try {
      // Parse and validate query parameters
      logger.info('queryAllRows - Parsing query parameters', logContext);
      const parseResult = queryParamsSchema.safeParse(req.query);
      
      if (!parseResult.success) {
        logger.error('queryAllRows - Invalid query parameters', { 
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
      logger.info('queryAllRows - Parsed query parameters', { 
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
      }

      // Execute the query for import metadata
      const { items: imports = [], requestCharge: importsCharge } = await this.executeQuery<ImportMetadata>(
        { ...queryParams, limit: 1000, offset: 0, fields: queryParams.fields ? queryParams.fields.join(',') : undefined },
        ['c.documentType = @documentType'],
        [{ name: '@documentType', value: 'excel-import' }]
      );

      // Ensure imports is an array
      const safeImports = Array.isArray(imports) ? imports : [];

      logger.info('queryAllRows - Found imports', {
        ...logContext,
        importCount: safeImports.length,
        requestCharge: importsCharge,
      });

      // Get row counts for each import
      const importRowCounts = await Promise.all(
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
          return { importId: imp._importId, rowCount: rowCount || 0 };
        })
      );

      // Map row counts back to imports
      const importsWithRowCounts = safeImports.map(imp => ({
        ...imp,
        rowCount: importRowCounts.find(irc => irc.importId === imp._importId)?.rowCount || 0,
      }));

      // Apply pagination
      const start = queryParams.offset || 0;
      const end = start + (queryParams.limit || 10);
      const paginatedImports = importsWithRowCounts.slice(start, end);

      // Prepare response
      const response = {
        success: true,
        data: {
          items: paginatedImports,
          total: importsWithRowCounts.length,
          page: Math.floor(start / (queryParams.limit || 10)) + 1,
          pageSize: queryParams.limit || 10,
          totalPages: Math.ceil(importsWithRowCounts.length / (queryParams.limit || 10)),
        },
        pagination: {
          total: importsWithRowCounts.length,
          limit: queryParams.limit,
          offset: queryParams.offset,
        },
      };

      logger.info('queryAllRows - Sending response', {
        ...logContext,
        itemCount: paginatedImports.length,
        totalCount: importsWithRowCounts.length,
      });

      return res.status(200).json(response);
    } catch (error) {
      return this.handleError(error, res, logContext);
    }
  }
}


