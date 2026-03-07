/**
 * Constants used throughout the ingestion service
 */

// Container and partition key constants
export const INGESTION_CONSTANTS = {
  METADATA_CONTAINER_NAME: 'excel-records',
  DATA_CONTAINER_NAME: 'excel-records',
  METADATA_PARTITION_KEY: 'imports',
  BATCH_SIZE: 50, // Optimized for 1000 RU/s free tier (changed from 100)
  DELAY_BETWEEN_BATCHES: 150, // NEW - Rate limiting in milliseconds
  MAX_RETRIES: 3,
  BASE_RETRY_DELAY: 500, // Changed from 1000 - less aggressive exponential backoff
  DOCUMENT_TYPES: {
    IMPORT: 'excel-import',
    ROW: 'excel-row'
  }
} as const;

// File processing constants
export const FILE_PROCESSING_CONSTANTS = {
  MAX_CONCURRENT_IMPORTS: 3,
  TEMP_UPLOAD_DIR: 'tmp_uploads'
} as const;

// Status constants
export const STATUS_CONSTANTS = {
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed'
} as const;