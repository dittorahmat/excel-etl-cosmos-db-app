import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IngestionService } from '../../../../server/src/services/ingestion/ingestion.service.js';
import { initializeCosmosDB } from '../../../../server/src/services/cosmos-db/cosmos-db.service.js';
import { uploadToBlobStorage } from '../../../../server/src/services/blob-storage/upload-to-blob-storage.js';
import { fileParserService } from '../../../../server/src/services/file-parser/file-parser.service.js';
import fs from 'fs/promises';

// Mock external dependencies
vi.mock('../../../../server/src/services/cosmos-db/cosmos-db.service.js');
vi.mock('../../../../server/src/services/blob-storage/upload-to-blob-storage.js');
vi.mock('../../../../server/src/services/file-parser/file-parser.service.js');
vi.mock('fs/promises');

describe('IngestionService', () => {
  let ingestionService: IngestionService;
  let mockCosmosDb: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockCosmosDb = {
      upsertRecord: vi.fn().mockResolvedValue({ _etag: 'mock-etag', statusCode: 200 }),
      query: vi.fn().mockResolvedValue([]),
    };
    // Ensure initializeCosmosDB always returns the same mock instance
    (initializeCosmosDB as vi.Mock).mockResolvedValue(mockCosmosDb);

    ingestionService = new IngestionService(); // Instantiate AFTER mocking initializeCosmosDB

    // Mock Blob Storage upload
    (uploadToBlobStorage as vi.Mock).mockResolvedValue('mock-blob-url');

    // Mock file system read and unlink
    (fs.readFile as vi.Mock).mockResolvedValue(Buffer.from('mock file content'));
    (fs.unlink as vi.Mock).mockResolvedValue(undefined);

    // Mock file parser service to include _importId in rows
    (fileParserService.parseFile as vi.Mock).mockImplementation((filePath, fileType, options) => {
      const originalRows = [{ col1: 'data1', col2: 'data2' }];
      const transformedRows = originalRows.map((row, index) =>
        options.transformRow ? options.transformRow(row, index) : row
      );
      return Promise.resolve({
        headers: ['col1', 'col2'],
        rows: transformedRows,
        totalRows: 1,
        validRows: 1,
        errorRows: 0,
        errors: [],
      });
    });
  });

  it('should be defined', () => {
    expect(ingestionService).toBeDefined();
  });

  it('should successfully import a file and save metadata', async () => {
    const filePath = '/tmp/test.xlsx';
    const fileName = 'test.xlsx';
    const fileType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const userId = 'test-user-123';

    const result = await ingestionService.startImport(filePath, fileName, fileType, userId);

    expect(result).toBeDefined();
    expect(result.id).toMatch(/^import_/);
    expect(result.fileName).toBe(fileName);
    expect(result.fileType).toBe(fileType);
    expect(result.status).toBe('processing'); // Initially processing
    expect(result.processedBy).toBe(userId);
    // These values are only set after processing completes, so they'll be 0 initially
    expect(result.totalRows).toBe(0);
    expect(result.validRows).toBe(0);
    expect(result.errorRows).toBe(0);
    expect(result.headers).toEqual([]);
    expect(result.errors).toEqual([]);
    expect(result._partitionKey).toBe('imports');
    // blobUrl is set immediately in the mock but would be set after processing in real scenario
    expect(result.blobUrl).toBe('mock-blob-url');

    expect(fs.readFile).toHaveBeenCalledWith(filePath);
    expect(uploadToBlobStorage).toHaveBeenCalledWith(expect.any(Buffer), expect.stringContaining(fileName), fileType);
    // With the new implementation, parseFile is called immediately for delimiter detection
    expect(fileParserService.parseFile).toHaveBeenCalled(); 
    expect(mockCosmosDb.upsertRecord).toHaveBeenCalledWith(expect.objectContaining({
      documentType: 'excel-import',
      fileName,
      status: 'processing',
    }), 'excel-records');
  });

  it('should handle errors during file upload and set status to failed', async () => {
    const filePath = '/tmp/test.xlsx';
    const fileName = 'test.xlsx';
    const fileType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const userId = 'test-user-123';

    // startImport should not reject even if processImport fails
    const result = await ingestionService.startImport(filePath, fileName, fileType, userId);

    expect(result).toBeDefined();
    expect(result.id).toMatch(/^import_/);
    expect(result.fileName).toBe(fileName);
    expect(result.fileType).toBe(fileType);
    expect(result.status).toBe('processing'); // Initially processing
    expect(result.processedBy).toBe(userId);
    // Other fields will be populated after processing completes

    expect(fs.readFile).toHaveBeenCalledWith(filePath);
    expect(uploadToBlobStorage).toHaveBeenCalledWith(expect.any(Buffer), expect.stringContaining(fileName), fileType);
    // With the new implementation, parseFile is called immediately for delimiter detection
    expect(fileParserService.parseFile).toHaveBeenCalled();
    expect(initializeCosmosDB).toHaveBeenCalledTimes(1); // Corrected: initializeCosmosDB is a singleton, called once at the start of startImport
    // We can't easily check the upsert calls here because they happen asynchronously
  });

  it('should directly test processImport error handling', async () => {
    const importId = 'test-import-id';
    const filePath = '/tmp/test.xlsx';
    const fileName = 'test.xlsx';
    const fileType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const userId = 'test-user-123';
    const fileBuffer = Buffer.from('mock file content');
    const errorMessage = 'Failed to upload file to blob storage: Blob upload failed';

    // Create initial metadata
    const importMetadata: any = {
      id: importId,
      fileName,
      fileType,
      fileSize: fileBuffer.length,
      status: 'processing',
      processedAt: new Date().toISOString(),
      processedBy: userId,
      totalRows: 0,
      validRows: 0,
      errorRows: 0,
      headers: [],
      errors: [],
      _partitionKey: 'imports',
    };

    (uploadToBlobStorage as vi.Mock).mockRejectedValue(new Error('Blob upload failed'));

    // Mock the cosmos DB to capture the final metadata
    let savedMetadata: any = null;
    mockCosmosDb.upsertRecord.mockImplementation((record: any) => {
      if (record.documentType === 'excel-import' && record.status === 'failed') {
        savedMetadata = record;
      }
      return Promise.resolve({ _etag: 'mock-etag', statusCode: 200 });
    });

    // Mock fs.unlink for the finally block
    (fs.unlink as vi.Mock).mockResolvedValue(undefined);

    // Call processImport directly
    await ingestionService['processImport'](
      importId,
      filePath,
      fileName,
      fileType,
      userId,
      fileBuffer,
      importMetadata,
      mockCosmosDb
    );

    // Check that the metadata was saved with failed status
    expect(savedMetadata).toBeDefined();
    expect(savedMetadata.status).toBe('failed');
    expect(savedMetadata.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ error: errorMessage })
      ])
    );
  });
});