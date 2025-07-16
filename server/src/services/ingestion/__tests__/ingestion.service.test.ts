import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ingestionService } from '../ingestion.service.js';
import { getOrInitializeCosmosDB } from '../../cosmos-db/cosmos-db.service.js';
import { fileParserService } from '../../file-parser/file-parser.service.js';

import { uploadToBlobStorage } from '../../blob-storage/upload-to-blob-storage.js';

// Mock dependencies
vi.mock('../../file-parser/file-parser.service.js');
vi.mock('../../cosmos-db/cosmos-db.service.js');
vi.mock('../../blob-storage/upload-to-blob-storage.js');

describe('IngestionService', () => {
  const mockItems = {
    query: vi.fn().mockReturnThis(),
    fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
    batch: vi.fn().mockResolvedValue([{ statusCode: 200 }]),
    upsert: vi.fn().mockResolvedValue({ resource: {} }),
  };

  const mockContainer = {
    items: mockItems,
  };

  const mockCosmosDb = {
    container: vi.fn().mockResolvedValue(mockContainer),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (getOrInitializeCosmosDB as any).mockResolvedValue(mockCosmosDb);
  });

  describe('importFile', () => {
    it('should process and import a file successfully', async () => {
      // Mock file parser
      (fileParserService.parseFile as any).mockResolvedValue({
        headers: ['Name', 'Age'],
        totalRows: 2,
        validRows: 2,
        errors: [],
        rows: [
          { Name: 'John', Age: 30 },
          { Name: 'Jane', Age: 25 },
        ],
      });

      // Call importFile
      const result = await ingestionService.importFile(
        Buffer.from('test'),
        'test.csv',
        'text/csv',
        'user123'
      );

      // Verify result
      expect(result.status).toBe('completed');
      expect(result.totalRows).toBe(2);
      expect(result.validRows).toBe(2);
      expect(result.errorRows).toBe(0);
      expect(result.processedBy).toBe('user123');
      expect(result.fileName).toBe('test.csv');

      // Verify Cosmos DB was called correctly
      expect(mockCosmosDb.container).toHaveBeenCalledTimes(2); // Once for metadata, once for data
      expect(mockItems.upsert).toHaveBeenCalledTimes(1); // For metadata
      expect(mockItems.batch).toHaveBeenCalledTimes(1); // For rows
    });

    it('should upload the file to blob storage', async () => {
      // Mock file parser
      (fileParserService.parseFile as any).mockResolvedValue({
        headers: ['Name', 'Age'],
        totalRows: 1,
        validRows: 1,
        errors: [],
        rows: [{ Name: 'John', Age: 30 }],
      });

      // Mock blob storage upload
      (uploadToBlobStorage as any).mockResolvedValue('http://blob.url/test.csv');

      // Call importFile
      await ingestionService.importFile(
        Buffer.from('test'),
        'test.csv',
        'text/csv',
        'user123'
      );

      // Verify blob storage was called
      expect(uploadToBlobStorage).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.stringContaining('test.csv'),
        'text/csv'
      );
    });

    it('should save initial import metadata', async () => {
      // Mock file parser
      (fileParserService.parseFile as any).mockResolvedValue({
        headers: [],
        totalRows: 0,
        validRows: 0,
        errors: [],
        rows: [],
      });

      // Call importFile
      await ingestionService.importFile(
        Buffer.from('test'),
        'test.csv',
        'text/csv',
        'user123'
      );

      // Verify that saveImportMetadata was called with processing status
      expect(mockItems.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'processing',
        })
      );
    });

    it('should update import metadata to completed on success', async () => {
      // Mock file parser
      (fileParserService.parseFile as any).mockResolvedValue({
        headers: ['Name', 'Age'],
        totalRows: 1,
        validRows: 1,
        errors: [],
        rows: [{ Name: 'John', Age: 30 }],
      });

      // Call importFile
      await ingestionService.importFile(
        Buffer.from('test'),
        'test.csv',
        'text/csv',
        'user123'
      );

      // Verify that saveImportMetadata was called with completed status
      expect(mockItems.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
        })
      );
    });

    it('should update import metadata to failed on error', async () => {
      // Mock file parser to throw an error
      const errorMessage = 'Parsing failed';
      (fileParserService.parseFile as any).mockRejectedValue(new Error(errorMessage));

      // Call importFile and expect it to throw
      await expect(
        ingestionService.importFile(
          Buffer.from('test'),
          'test.csv',
          'text/csv',
          'user123'
        )
      ).rejects.toThrow(errorMessage);

      // Verify that saveImportMetadata was called with failed status
      expect(mockItems.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
        })
      );
    });

    it('should handle parsing errors', async () => {
      // Mock file parser with errors
      (fileParserService.parseFile as any).mockResolvedValue({
        headers: ['Name', 'Age'],
        totalRows: 3,
        validRows: 1,
        errors: [
          { row: 2, error: 'Invalid age', rawData: { Name: 'Bob', Age: 'invalid' } },
        ],
        rows: [
          { Name: 'John', Age: 30 },
        ],
      });

      // Call importFile
      const result = await ingestionService.importFile(
        Buffer.from('test'),
        'test.csv',
        'text/csv',
        'user123'
      );

      // Verify result
      expect(result.status).toBe('completed');
      expect(result.totalRows).toBe(3);
      expect(result.validRows).toBe(1);
      expect(result.errorRows).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0].error).toBe('Invalid age');
    });

    it('should handle database errors during import', async () => {
      // Mock file parser to succeed
      (fileParserService.parseFile as any).mockResolvedValue({
        headers: ['Name', 'Age'],
        totalRows: 1,
        validRows: 1,
        errors: [],
        rows: [{ Name: 'John', Age: 30 }],
      });

      // Mock database to fail
      const error = new Error('Database error');
      mockItems.batch.mockRejectedValueOnce(error);

      // Call importFile and expect it to throw
      await expect(
        ingestionService.importFile(
          Buffer.from('test'),
          'test.csv',
          'text/csv',
          'user123'
        )
      ).rejects.toThrow('Failed to save rows: Database error');
    });

    it('should handle blob storage upload errors', async () => {
      // Mock file parser to succeed
      (fileParserService.parseFile as any).mockResolvedValue({
        headers: ['Name', 'Age'],
        totalRows: 1,
        validRows: 1,
        errors: [],
        rows: [{ Name: 'John', Age: 30 }],
      });

      // Mock blob storage to fail
      const error = new Error('Blob storage error');
      (uploadToBlobStorage as any).mockRejectedValue(error);

      // Call importFile and expect it to throw
      await expect(
        ingestionService.importFile(
          Buffer.from('test'),
          'test.csv',
          'text/csv',
          'user123'
        )
      ).rejects.toThrow('Blob storage error');

      // Verify that saveImportMetadata was called with failed status
      expect(mockItems.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
        })
      );
    });

    it('should handle partial failures when saving rows', async () => {
      // Mock file parser
      (fileParserService.parseFile as any).mockResolvedValue({
        headers: ['Name', 'Age'],
        totalRows: 2,
        validRows: 2,
        errors: [],
        rows: [
          { Name: 'John', Age: 30 },
          { Name: 'Jane', Age: 25 },
        ],
      });

      // Mock Cosmos DB to fail for one of the rows
      mockItems.upsert
        .mockResolvedValueOnce({ resource: {}, statusCode: 200 })
        .mockRejectedValueOnce(new Error('DB error on second row'));

      // Call importFile and expect it to throw
      await expect(
        ingestionService.importFile(
          Buffer.from('test'),
          'test.csv',
          'text/csv',
          'user123'
        )
      ).rejects.toThrow('Failed to save 1 rows in batch 1');
    });

    it('should handle imports with no valid rows', async () => {
      // Mock file parser with no valid rows
      (fileParserService.parseFile as any).mockResolvedValue({
        headers: ['Name', 'Age'],
        totalRows: 1,
        validRows: 0,
        errors: [{ row: 1, error: 'Invalid data', rawData: { Name: 'Test', Age: 'Fail' } }],
        rows: [],
      });

      // Call importFile
      const result = await ingestionService.importFile(
        Buffer.from('test'),
        'test.csv',
        'text/csv',
        'user123'
      );

      // Verify result
      expect(result.status).toBe('completed');
      expect(result.totalRows).toBe(1);
      expect(result.validRows).toBe(0);
      expect(result.errorRows).toBe(1);

      // Verify that batch was not called
      expect(mockItems.batch).not.toHaveBeenCalled();
    });
  });

  describe('getImport', () => {
    it('should return null if import is not found', async () => {
      mockItems.query.mockResolvedValue({ resources: [] });

      const result = await ingestionService.getImport('non-existent-id');

      expect(result).toBeNull();
      expect(mockItems.query).toHaveBeenCalledWith(
        expect.stringContaining('c.id = @id'),
        expect.arrayContaining([expect.objectContaining({ name: '@id', value: 'import_non-existent-id' })])
      );
    });

    it('should return null for non-existent import', async () => {
      mockItems.query.mockResolvedValueOnce({ resources: [] });
      const result = await ingestionService.getImport('nonexistent');
      expect(result).toBeNull();
    });

    it('should return import metadata', async () => {
      const mockImport = { 
        id: 'import_1', 
        fileName: 'test.csv', 
        status: 'completed',
        _partitionKey: 'imports'
      };
      mockItems.query.mockResolvedValueOnce({ resources: [mockImport] });

      const result = await ingestionService.getImport('import_1');
      expect(result).toEqual(mockImport);
    });

    it('should re-throw other errors from getImport', async () => {
      const error = new Error('Some other DB error');
      mockItems.query.mockRejectedValue(error);

      await expect(ingestionService.getImport('any-id')).rejects.toThrow('Some other DB error');
    });
  });

  describe('listImports', () => {
    it('should return paginated list of imports', async () => {
      const mockImports = [
        { 
          id: 'import_1', 
          fileName: 'test1.csv', 
          status: 'completed',
          _partitionKey: 'imports' 
        },
        { 
          id: 'import_2', 
          fileName: 'test2.csv', 
          status: 'completed',
          _partitionKey: 'imports'
        },
      ];
      
      mockItems.query
        .mockResolvedValueOnce({ resources: mockImports })
        .mockResolvedValueOnce({ resources: [2] });

      const result = await ingestionService.listImports({ limit: 10, offset: 0 });
      expect(result.items).toEqual(mockImports);
      expect(result.total).toBe(2);
    });

    it('should filter by status', async () => {
      const mockImports = [
        { 
          id: 'import_1', 
          fileName: 'test1.csv', 
          status: 'completed',
          _partitionKey: 'imports'
        },
      ];
      
      mockItems.query
        .mockResolvedValueOnce({ resources: mockImports })
        .mockResolvedValueOnce({ resources: [{ count: 1 }] });

      const result = await ingestionService.listImports({ status: 'completed' });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].status).toBe('completed');
      expect(mockItems.query).toHaveBeenCalledWith(
        expect.stringContaining('c.status = @status'),
        expect.arrayContaining([expect.objectContaining({ name: '@status', value: 'completed' })])
      );
    });

    it('should handle invalid status filter', async () => {
      const mockImports = [
        { 
          id: 'import_1', 
          fileName: 'test1.csv', 
          status: 'completed',
          _partitionKey: 'imports'
        },
      ];
      
      mockItems.query
        .mockResolvedValueOnce({ resources: mockImports })
        .mockResolvedValueOnce({ resources: [{ count: 1 }] });

      const result = await ingestionService.listImports({ status: 'invalid-status' as any });
      expect(result.items).toHaveLength(1);
      expect(mockItems.query).toHaveBeenCalledWith(
        expect.stringContaining('c.status = @status'),
        expect.arrayContaining([expect.objectContaining({ name: '@status', value: 'invalid-status' })])
      );
    });

    it('should handle database errors when listing imports', async () => {
      const error = new Error('DB error');
      mockItems.query.mockRejectedValue(error);

      await expect(ingestionService.listImports({})).rejects.toThrow('Failed to list imports: DB error');
    });
  });
});