import { fileProcessingQueue, type QueueItem } from './queue.service.js';
import { ingestionService } from '../ingestion/ingestion.service.js';
import { logger } from '../../utils/logger.js';

// Processor function for the queue
export const processQueueItem = async (item: QueueItem): Promise<void> => {
  try {
    logger.info('Starting to process queue item', { 
      queueItemId: item.id, 
      fileName: item.fileName 
    });
    
    // Process the file using the ingestion service
    const importMetadata = await ingestionService.startImport(
      item.filePath,
      item.fileName,
      item.fileType,
      item.userId,
      item.userName,
      item.userEmail
    );
    
    logger.info('Queue item processed successfully', {
      queueItemId: item.id,
      importId: importMetadata.id,
      fileName: item.fileName,
      totalRows: importMetadata.totalRows,
      validRows: importMetadata.validRows,
      errorRows: importMetadata.errorRows,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to process queue item', {
      queueItemId: item.id,
      fileName: item.fileName,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Update item with error
    item.status = 'failed';
    item.error = errorMessage;
    item.completedAt = new Date();
    
    throw error;
  }
};

// Set the processor for the queue
fileProcessingQueue.setProcessor(processQueueItem);