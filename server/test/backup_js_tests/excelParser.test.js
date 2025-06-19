import { processExcelFile } from '../src/routes/upload.route.js';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock the xlsx module
const mockRead = vi.fn();
const mockSheetToJson = vi.fn();

vi.mock('xlsx', () => ({
  read: mockRead,
  utils: {
    sheet_to_json: mockSheetToJson,
  },
}));

// Mock Azure services
const mockUpsertRecord = vi.fn().mockImplementation((record) => Promise.resolve(record));

vi.mock('../src/config/azure-services.js', () => ({
  initializeAzureServices: vi.fn().mockResolvedValue({
    blobStorage: {
      uploadFile: vi.fn().mockResolvedValue('https://example.com/test.xlsx'),
    },
    cosmosDb: {
      upsertRecord: mockUpsertRecord,
    },
  }),
  getCosmosDb: vi.fn().mockImplementation(() => ({
    upsertRecord: mockUpsertRecord,
  })),
}));

// Mock uuid
vi.mock('uuid', () => ({
  v4: () => 'test-uuid-123',
}));

describe('Excel Parser', () => {
  const mockFileBuffer = Buffer.from('test file content');
  const mockFileName = 'test.xlsx';
  const mockContainerName = 'test-container';
  const mockUserId = 'user-123';
  
  // Reset all mocks before each test
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    mockRead.mockImplementation(() => ({
      SheetNames: ['Sheet1'],
      Sheets: {
        Sheet1: { '!ref': 'A1:B3' },
      },
    }));
    
    mockSheetToJson.mockImplementation(() => [
      { 'Column 1': 'Value 1', 'Column 2': 'Value 2' },
      { 'Column 1': 'Value 3', 'Column 2': 'Value 4' },
    ]);
    
    mockUpsertRecord.mockClear();
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });
  
  describe('processExcelFile', () => {
    it('should successfully process a valid Excel file', async () => {
      // Setup mock for XLSX.read
      const mockWorkbook = {
        SheetNames: ['Sheet1'],
        Sheets: {
          Sheet1: {
            '!ref': 'A1:B3',
            A1: { v: 'Column 1' },
            B1: { v: 'Column 2' },
            A2: { v: 'Value 1' },
            B2: { v: 'Value 2' },
            A3: { v: 'Value 3' },
            B3: { v: 'Value 4' },
          },
        },
      };
      
      mockRead.mockReturnValueOnce(mockWorkbook);
      
      // Execute
      const result = await processExcelFile({
        buffer: mockFileBuffer,
        originalname: mockFileName,
      }, mockContainerName, mockUserId);
      
      // Verify
      expect(mockRead).toHaveBeenCalledWith(mockFileBuffer, { type: 'buffer' });
      expect(mockSheetToJson).toHaveBeenCalledWith(
        mockWorkbook.Sheets['Sheet1'],
        { defval: '', raw: false, dateNF: 'yyyy-mm-dd' }
      );
      
      // Verify the result
      expect(result).toEqual({
        fileUrl: 'https://example.com/test.xlsx',
        fileName: mockFileName,
        recordsProcessed: 2,
        recordIds: ['test-uuid-123', 'test-uuid-123'],
      });
      
      // Verify records were upserted
      expect(mockUpsertRecord).toHaveBeenCalledTimes(2);
      expect(mockUpsertRecord).toHaveBeenCalledWith(expect.objectContaining({
        id: 'test-uuid-123',
        fileName: mockFileName,
        userId: mockUserId,
        data: expect.objectContaining({
          'Column 1': 'Value 1',
          'Column 2': 'Value 2',
        }),
      }));
    });
    
    it('should handle empty Excel files', async () => {
      // Setup empty workbook
      const emptyWorkbook = {
        SheetNames: ['Sheet1'],
        Sheets: {
          Sheet1: { '!ref': 'A1:A1' },
        },
      };
      
      mockRead.mockReturnValueOnce(emptyWorkbook);
      mockSheetToJson.mockReturnValueOnce([]);
      
      // Execute
      const result = await processExcelFile({
        buffer: mockFileBuffer,
        originalname: mockFileName,
      }, mockContainerName, mockUserId);
      
      // Verify
      expect(result).toEqual({
        fileUrl: 'https://example.com/test.xlsx',
        fileName: mockFileName,
        recordsProcessed: 0,
        recordIds: [],
      });
      expect(mockUpsertRecord).not.toHaveBeenCalled();
    });
    
    it('should handle errors during file processing', async () => {
      const testError = new Error('Test error');
      mockRead.mockImplementationOnce(() => {
        throw testError;
      });
      
      // Execute and verify
      await expect(
        processExcelFile({
          buffer: mockFileBuffer,
          originalname: mockFileName,
        }, mockContainerName, mockUserId)
      ).rejects.toThrow('Test error');
    });
  });
});
