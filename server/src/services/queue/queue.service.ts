import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/logger.js';

// Define the queue item structure
export interface QueueItem {
  id: string;
  filePath: string;
  fileName: string;
  fileType: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

// Simple in-memory queue
class FileProcessingQueue {
  private queue: QueueItem[] = [];
  private processing: boolean = false;
  private maxConcurrent: number = 3; // Limit concurrent processing
  private currentProcessing: number = 0;
  private processor: ((item: QueueItem) => Promise<void>) | null = null;

  // Add an item to the queue
  enqueue(item: Omit<QueueItem, 'id' | 'status' | 'createdAt'>): QueueItem {
    const queueItem: QueueItem = {
      id: uuidv4(),
      ...item,
      status: 'pending',
      createdAt: new Date()
    };
    
    this.queue.push(queueItem);
    logger.info('File added to processing queue', { 
      queueItemId: queueItem.id, 
      fileName: queueItem.fileName,
      queueSize: this.queue.length 
    });
    
    // Start processing if not already processing
    if (!this.processing) {
      this.processQueue();
    }
    
    return queueItem;
  }

  // Get the status of a queue item
  getStatus(id: string): QueueItem | undefined {
    return this.queue.find(item => item.id === id);
  }

  // Get all items in the queue
  getAllItems(): QueueItem[] {
    return [...this.queue];
  }

  // Process the queue
  private async processQueue(): Promise<void> {
    if (this.processing) {
      return;
    }
    
    this.processing = true;
    logger.info('Starting queue processing');
    
    while (this.queue.length > 0 && this.currentProcessing < this.maxConcurrent) {
      const item = this.queue.find(i => i.status === 'pending');
      
      if (item) {
        // Update item status
        item.status = 'processing';
        item.startedAt = new Date();
        
        this.currentProcessing++;
        logger.info('Starting to process file', { 
          queueItemId: item.id, 
          fileName: item.fileName,
          currentProcessing: this.currentProcessing
        });
        
        // Process the item asynchronously
        this.processItem(item)
          .then(() => {
            this.currentProcessing--;
            this.processQueue(); // Continue processing
          })
          .catch((error) => {
            logger.error('Error in queue processing', { error });
            this.currentProcessing--;
            this.processQueue(); // Continue processing
          });
      } else {
        // No pending items, wait a bit before checking again
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    this.processing = false;
    logger.info('Queue processing completed');
  }

  // Process a single item
  private async processItem(item: QueueItem): Promise<void> {
    if (!this.processor) {
      logger.error('No processor set for queue', { queueItemId: item.id });
      item.status = 'failed';
      item.error = 'No processor configured';
      item.completedAt = new Date();
      return;
    }
    
    try {
      await this.processor(item);
      
      // Mark as completed if processor didn't already do it
      if (item.status === 'processing') {
        item.status = 'completed';
        item.completedAt = new Date();
      }
      
      logger.info('Item processing completed', { 
        queueItemId: item.id, 
        fileName: item.fileName,
        status: item.status
      });
    } catch (error) {
      // Mark as failed if not already marked
      if (item.status !== 'failed') {
        item.status = 'failed';
        item.error = error instanceof Error ? error.message : 'Unknown error';
        item.completedAt = new Date();
      }
      
      logger.error('Item processing failed', { 
        queueItemId: item.id, 
        fileName: item.fileName,
        error: item.error
      });
      
      // Re-throw to be caught by the caller
      throw error;
    }
  }

  // Set a custom processor function
  setProcessor(processor: (item: QueueItem) => Promise<void>): void {
    this.processor = processor;
  }
}

// Export a singleton instance
export const fileProcessingQueue = new FileProcessingQueue();