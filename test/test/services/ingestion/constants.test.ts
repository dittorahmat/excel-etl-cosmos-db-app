import { describe, it, expect } from 'vitest';
import { INGESTION_CONSTANTS, FILE_PROCESSING_CONSTANTS, STATUS_CONSTANTS } from '../../../../server/src/services/ingestion/constants.js';

describe('Ingestion Constants', () => {
  it('should have correct container and partition key constants', () => {
    expect(INGESTION_CONSTANTS.METADATA_CONTAINER_NAME).toBe('excel-records');
    expect(INGESTION_CONSTANTS.DATA_CONTAINER_NAME).toBe('excel-records');
    expect(INGESTION_CONSTANTS.METADATA_PARTITION_KEY).toBe('imports');
    expect(INGESTION_CONSTANTS.BATCH_SIZE).toBe(100);
  });

  it('should have correct document type constants', () => {
    expect(INGESTION_CONSTANTS.DOCUMENT_TYPES.IMPORT).toBe('excel-import');
    expect(INGESTION_CONSTANTS.DOCUMENT_TYPES.ROW).toBe('excel-row');
  });

  it('should have correct file processing constants', () => {
    expect(FILE_PROCESSING_CONSTANTS.MAX_CONCURRENT_IMPORTS).toBe(3);
    expect(FILE_PROCESSING_CONSTANTS.TEMP_UPLOAD_DIR).toBe('tmp_uploads');
  });

  it('should have correct status constants', () => {
    expect(STATUS_CONSTANTS.PROCESSING).toBe('processing');
    expect(STATUS_CONSTANTS.COMPLETED).toBe('completed');
    expect(STATUS_CONSTANTS.FAILED).toBe('failed');
  });
});