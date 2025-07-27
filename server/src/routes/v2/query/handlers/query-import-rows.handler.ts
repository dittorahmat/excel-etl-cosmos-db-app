import { Request, Response } from 'express';
import { logger } from '../../../../utils/logger.js';
import { BaseQueryHandler } from './base.handler.js';
import { AzureCosmosDB } from '../../../../types/azure.js';
import { queryParamsSchema } from '../schemas/query.schemas.js';

export class QueryImportRowsHandler extends BaseQueryHandler {
  constructor(cosmosDb: AzureCosmosDB) {
    super(cosmosDb, 'excel-records', '/_partitionKey');
  }

  public async handle(req: Request, res: Response): Promise<Response | void> {
    const { importId } = req.params;
    const logContext = { requestId: Math.random().toString(36).substring(2, 9), importId };

    logger.info('queryImportRows - Starting request', { 
      ...logContext,
      method: req.method,
      url: req.originalUrl,
      params: req.params,
      query: req.query,
    });

    if (!importId) {
      logger.error('queryImportRows - Missing importId', logContext);
      return res.status(400).json({
        success: false,
        error: 'Import ID is required',
      });
    }

    try {
      // Parse and validate query parameters
      logger.info('queryImportRows - Parsing query parameters', logContext);
      const parseResult = queryParamsSchema.safeParse(req.query);
      
      if (!parseResult.success) {
        logger.error('queryImportRows - Invalid query parameters', { 
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
      logger.info('queryImportRows - Parsed query parameters', { 
        ...logContext,
        queryParams 
      });

      // Normalize the import ID to handle both single and double 'import_' prefixes
      let fullImportId = importId;
      const baseId = fullImportId.replace(/^import_+/g, '');
      fullImportId = `import_${baseId}`;
      
      // For rows, we need to try both single and double 'import_' prefixes for _importId
      const possibleImportIds = [fullImportId];
      if (!fullImportId.startsWith('import_import_')) {
        possibleImportIds.push(`import_${fullImportId}`);
      }

      // Build the WHERE clause for import ID
      const importIdClauses = possibleImportIds.map((_, i) => `c._importId = @importId${i}`);
      const importIdParams = possibleImportIds.map((id, i) => ({
        name: `@importId${i}`,
        value: id
      }));

      // Execute the query
      const { items, requestCharge } = await this.executeQuery<Record<string, unknown>>(
        { ...queryParams, fields: queryParams.fields ? queryParams.fields.join(',') : undefined },
        [
          `(${importIdClauses.join(' OR ')})`,
          'c.documentType = @documentType'
        ],
        [
          ...importIdParams,
          { name: '@documentType', value: 'excel-row' }
        ]
      );

      // Ensure items is an array
      const safeItems = Array.isArray(items) ? items : [];

      logger.info('queryImportRows - Query executed', {
        ...logContext,
        itemsCount: items.length,
        requestCharge,
      });

      // Get total count
      const totalCount = await this.getTotalCount(
        [
          `(${importIdClauses.join(' OR ')})`,
          'c.documentType = @documentType'
        ],
        [
          ...importIdParams,
          { name: '@documentType', value: 'excel-row' }
        ]
      );

      // Prepare response
      const response = {
        success: true,
        data: {
          items: safeItems,
          fields: queryParams.fields || [],
          total: totalCount,
          page: Math.floor((queryParams.offset || 0) / (queryParams.limit || 10)) + 1,
          pageSize: queryParams.limit || 10,
          totalPages: Math.ceil((totalCount || 0) / (queryParams.limit || 10)),
        },
        pagination: {
          total: totalCount,
          limit: queryParams.limit,
          offset: queryParams.offset,
        },
      };

      logger.info('queryImportRows - Sending response', {
        ...logContext,
        itemCount: safeItems.length,
        totalCount,
      });

      return res.status(200).json(response);
    } catch (error) {
      return this.handleError(error, res, logContext);
    }
  }
}


