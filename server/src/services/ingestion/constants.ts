/**
 * Constants used throughout the ingestion service
 */

// Container and partition key constants
export const INGESTION_CONSTANTS = {
  METADATA_CONTAINER_NAME: 'excel-records',
  DATA_CONTAINER_NAME: 'excel-records',
  METADATA_PARTITION_KEY: 'imports',
  BATCH_SIZE: 100, // Cosmos DB batch limit
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