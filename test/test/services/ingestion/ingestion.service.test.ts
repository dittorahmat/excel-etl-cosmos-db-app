import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IngestionService } from '../../../src/services/ingestion/ingestion.service.js';
import { initializeCosmosDB } from '../../../src/services/cosmos-db/cosmos-db.service.js';
import { uploadToBlobStorage } from '../../../src/services/blob-storage/upload-to-blob-storage.js';
import { fileParserService } from '../../../src/services/file-parser/file-parser.service.js';
import fs from 'fs/promises';

// Mock external dependencies
vi.mock('../../../src/services/cosmos-db/cosmos-db.service.js');
vi.mock('../../../src/services/blob-storage/upload-to-blob-storage.js');
vi.mock('../../../src/services/file-parser/file-parser.service.js');
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

    // Mock file system read
    (fs.readFile as vi.Mock).mockResolvedValue(Buffer.from('mock file content'));

    // Mock file parser service to include _importId in rows
    (fileParserService.parseFile as vi.Mock).mockImplementation((filePath, fileType, options) => {
      const originalRows = [{ col1: 'data1', col2: 'data2' }];
      const transformedRows = originalRows.map((row, index) =>
        options.transformRow(row, index)
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

    const result = await ingestionService.importFile(filePath, fileName, fileType, userId);

    expect(result).toBeDefined();
    expect(result.id).toMatch(/^import_/);
    expect(result.fileName).toBe(fileName);
    expect(result.fileType).toBe(fileType);
    expect(result.status).toBe('completed');
    expect(result.processedBy).toBe(userId);
    expect(result.totalRows).toBe(1);
    expect(result.validRows).toBe(1);
    expect(result.errorRows).toBe(0);
    expect(result.headers).toEqual(['col1', 'col2']);
    expect(result.errors).toEqual([]);
    expect(result._partitionKey).toBe('imports');
    expect(result.blobUrl).toBe('mock-blob-url');

    expect(fs.readFile).toHaveBeenCalledWith(filePath);
    expect(uploadToBlobStorage).toHaveBeenCalledWith(expect.any(Buffer), expect.stringContaining(fileName), fileType);
    expect(fileParserService.parseFile).toHaveBeenCalledWith(filePath, fileType, expect.any(Object));
    expect(mockCosmosDb.upsertRecord).toHaveBeenCalledTimes(3); // Initial metadata + final metadata + 1 row
    expect(mockCosmosDb.upsertRecord).toHaveBeenCalledWith(expect.objectContaining({
      documentType: 'excel-import',
      fileName,
      status: 'processing',
    }), 'excel-records');
    expect(mockCosmosDb.upsertRecord).toHaveBeenCalledWith(expect.objectContaining({
      documentType: 'excel-import',
      fileName,
      status: 'completed',
    }), 'excel-records');
    expect(mockCosmosDb.upsertRecord).toHaveBeenCalledWith(expect.objectContaining({
      documentType: 'excel-row',
      _importId: expect.any(String),
      _rowNumber: '1',
      col1: 'data1',
    }));
  });

  it('should handle errors during file upload and set status to failed', async () => {
    const filePath = '/tmp/test.xlsx';
    const fileName = 'test.xlsx';
    const fileType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const userId = 'test-user-123';
    const errorMessage = 'Blob upload failed';

    (uploadToBlobStorage as vi.Mock).mockRejectedValue(new Error(errorMessage));

    await expect(ingestionService.importFile(filePath, fileName, fileType, userId)).rejects.toThrow(errorMessage);

    expect(fs.readFile).toHaveBeenCalledWith(filePath);
    expect(uploadToBlobStorage).toHaveBeenCalledWith(expect.any(Buffer), expect.stringContaining(fileName), fileType);
    expect(fileParserService.parseFile).not.toHaveBeenCalled(); // Should not be called if upload fails
    expect(initializeCosmosDB).toHaveBeenCalledTimes(1); // Corrected: initializeCosmosDB is a singleton, called once at the start of importFile
    expect(mockCosmosDb.upsertRecord).toHaveBeenCalledTimes(2); // Initial metadata (processing) + final metadata (failed)
    expect(mockCosmosDb.upsertRecord).toHaveBeenCalledWith(expect.objectContaining({
      documentType: 'excel-import',
      fileName,
      status: 'processing',
    }), 'excel-records');
    expect(mockCosmosDb.upsertRecord).toHaveBeenCalledWith(expect.objectContaining({
      documentType: 'excel-import',
      fileName,
      status: 'failed',
      errors: expect.arrayContaining([
        expect.objectContaining({ error: errorMessage })
      ]),
    }), 'excel-records');
  });
});