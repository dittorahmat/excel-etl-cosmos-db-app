import { Request, Response } from 'express';
import { logger } from '../../../../utils/logger.js';
import { BaseQueryHandler } from './base.handler.js';
import { AzureCosmosDB } from '../../../../types/azure.js';

export class GetImportMetadataHandler extends BaseQueryHandler {
  constructor(cosmosDb: AzureCosmosDB) {
    super(cosmosDb, cosmosDb.database, 'excel-records', '/_partitionKey');
  }

  public async handle(req: Request, res: Response): Promise<Response | void> {
    const { importId } = req.params;
    const logContext = { requestId: Math.random().toString(36).substring(2, 9), importId };

    logger.info('getImportMetadata - Starting request', { 
      ...logContext,
      method: req.method,
      url: req.originalUrl,
      params: req.params,
    });

    if (!importId) {
      logger.error('getImportMetadata - Missing importId', logContext);
      return res.status(400).json({
        success: false,
        error: 'Import ID is required',
      });
    }

    try {
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

      // Get import metadata
      const { items: [importMetadata], requestCharge: metadataCharge } = await this.executeQuery<ImportMetadata>(
        { limit: 1, offset: 0 },
        [
          `(${importIdClauses.join(' OR ')})`,
          'c.documentType = @documentType'
        ],
        [
          ...importIdParams,
          { name: '@documentType', value: 'excel-import' }
        ]
      );

      if (!importMetadata) {
        logger.warn('getImportMetadata - Import not found', {
          ...logContext,
          possibleImportIds,
        });
        return res.status(404).json({
          success: false,
          error: 'Import not found',
        });
      }

      if (!importMetadata) {
        logger.warn('getImportMetadata - Import not found', {
          ...logContext,
          possibleImportIds,
        });
        return res.status(404).json({
          success: false,
          error: 'Import not found',
        });
      }

      logger.info('getImportMetadata - Found import metadata', {
        ...logContext,
        importId: importMetadata._importId,
        requestCharge: metadataCharge,
      });

      // Get row count for this import
      const { items: [rowCount] } = await this.executeQuery<number>(
        { limit: 1, offset: 0 },
        [
          `(${importIdClauses.join(' OR ')})`,
          'c.documentType = @documentType'
        ],
        [
          ...importIdParams,
          { name: '@documentType', value: 'excel-row' }
        ]
      );
      
      const safeRowCount = rowCount || 0;

      // Prepare response
      const response = {
        success: true,
        data: {
          ...importMetadata,
          rowCount: safeRowCount,
        },
      };

      logger.info('getImportMetadata - Sending response', {
        ...logContext,
        rowCount: safeRowCount,
      });

      // Set cache headers for better performance - import metadata changes infrequently
      res.set('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes

      return res.status(200).json(response);
    } catch (error) {
      return this.handleError(error, res, logContext);
    }
  }
}


