import { Request, Response } from 'express';
import { logger } from '../../../../utils/logger.js';
import { ingestionService } from '../../../../services/ingestion/ingestion.service.js';

export class DeleteImportHandler {
  public async handle(req: Request, res: Response): Promise<Response | void> {
    const { importId } = req.params;
    const logContext = { requestId: Math.random().toString(36).substring(2, 9), importId };

    logger.info('deleteImport - Starting request', { 
      ...logContext,
      method: req.method,
      url: req.originalUrl,
      params: req.params,
    });

    if (!importId) {
      logger.error('deleteImport - Missing importId', logContext);
      return res.status(400).json({
        success: false,
        error: 'Import ID is required',
      });
    }

    try {
      logger.info('deleteImport - Calling ingestionService.deleteImport', { 
        ...logContext,
        importId,
      });
      
      // Use the ingestion service to delete the import
      const result = await ingestionService.deleteImport(importId);
      
      logger.info('deleteImport - Successfully called ingestionService.deleteImport', { 
        ...logContext,
        importId,
        result,
      });
      
      // Prepare response
      const response = {
        success: true,
        message: `Successfully deleted import and ${result.deletedRows} rows`,
        data: {
          importId,
          deletedRows: result.deletedRows
        },
      };

      logger.info('deleteImport - Sending response', {
        ...logContext,
        deletedRows: result.deletedRows,
      });

      // Set cache control headers to help with cache invalidation
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate'); // Prevent caching
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');

      return res.status(200).json(response);
    } catch (error) {
      logger.error('deleteImport - Error occurred', {
        ...logContext,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      
      if (error instanceof Error && error.message === 'Import not found') {
        return res.status(404).json({
          success: false,
          error: 'Import not found',
        });
      }
      
      // Create a simple error response without the BaseQueryHandler
      const errorResponse = {
        success: false,
        error: 'Query failed',
        message: 'An error occurred while processing your request.'
      };
      
      return res.status(500).json(errorResponse);
    }
  }
}