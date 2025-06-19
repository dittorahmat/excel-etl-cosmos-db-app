import { describe, it, expect, vi, beforeEach } from 'vitest'; // Removed unused Mock import
import { processExcelFile } from '../src/routes/upload.route.js';
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';

// Mock the xlsx module
vi.mock('xlsx');

// Mock the Azure services
vi.mock('../src/config/azure-services.js', () => {
  const upsertRecord = vi.fn().mockImplementation((record: any) => Promise.resolve(record));
  return {
    initializeAzureServices: vi.fn().mockResolvedValue({
      cosmosDb: { 
        upsertRecord,
        container: {
          items: {
            upsert: upsertRecord
          }
        }
      },
      blobStorage: {
        uploadFile: vi.fn().mockResolvedValue({
          url: 'https://example.com/test.xlsx'
        })
      }
    }),
  };
});

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn().mockReturnValue('test-uuid-123')
}));

describe('Excel Parser', () => {
  const mockFileBuffer = Buffer.from('test file content');
  const mockFileName = 'test.xlsx';
  const mockContainerName = 'test-container';
  const mockUserId = 'user-123';

  // Reset all mocks before each test
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('processExcelFile', () => {
    it('should successfully process a valid Excel file', async () => {
      // Setup mock for XLSX.read
      const mockWorkbook = {
        SheetNames: ['Sheet1'],
        Sheets: {
          Sheet1: {
            '!ref': 'A1:C3',
            A1: { t: 's', v: 'Name' },
            B1: { t: 's', v: 'Age' },
            C1: { t: 's', v: 'Email' },
            A2: { t: 's', v: 'John' },
            B2: { t: 'n', v: 30 },
            C2: { t: 's', v: 'john@example.com' },
            A3: { t: 's', v: 'Jane' },
            B3: { t: 'n', v: 25 },
            C3: { t: 's', v: 'jane@example.com' },
          }
        }
      };

      // Mock XLSX functions
      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      // Patch XLSX.utils methods individually (avoid reassigning XLSX.utils)
      vi.spyOn(XLSX.utils, 'sheet_to_json').mockReturnValue([
        { Name: 'John', Age: 30, Email: 'john@example.com' },
        { Name: 'Jane', Age: 25, Email: 'jane@example.com' }
      ]);
      vi.spyOn(XLSX.utils, 'decode_range').mockReturnValue({ s: { c: 0, r: 0 }, e: { c: 2, r: 2 } });
      vi.spyOn(XLSX.utils, 'encode_cell').mockImplementation(({ c, r }) => `${String.fromCharCode(65 + c)}${r + 1}`);

      // Execute
      const result = await processExcelFile(mockFileBuffer, mockFileName, mockContainerName, mockUserId);

      // Verify
      expect(result.success).toBe(true);
      expect(result.count).toBe(2);
      expect(XLSX.read).toHaveBeenCalledWith(mockFileBuffer, {
        type: 'buffer',
        cellDates: true,
        dateNF: 'yyyy-mm-dd'
      });
    });

    it('should handle empty Excel files', async () => {
      // Setup mock for empty workbook
      const mockWorkbook = {
        SheetNames: ['Sheet1'],
        Sheets: {
          Sheet1: { '!ref': 'A1:A1' } // Empty sheet
        }
      };

      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue([]);

      // Execute
      const result = await processExcelFile(mockFileBuffer, mockFileName, mockContainerName, mockUserId);

      // Verify
      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot read properties of undefined');
    });

    it('should handle parsing errors', async () => {
      // Setup mock to throw error
      vi.mocked(XLSX.read).mockImplementation(() => {
        throw new Error('Invalid file format');
      });

      // Execute
      const result = await processExcelFile(mockFileBuffer, mockFileName, mockContainerName, mockUserId);

      // Verify
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to parse Excel file');
    });

    it('should handle record processing errors gracefully', async () => {
      // Setup mock for valid workbook but failing upsert
      const mockWorkbook = {
        SheetNames: ['Sheet1'],
        Sheets: {
          Sheet1: {
            '!ref': 'A1:C2',
            A1: { t: 's', v: 'Name' },
            B1: { t: 's', v: 'Age' },
            C1: { t: 's', v: 'Email' },
            A2: { t: 's', v: 'John' },
            B2: { t: 'n', v: 30 },
            C2: { t: 's', v: 'john@example.com' }
          }
        }
      };

      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue([
        { Name: 'John', Age: 30, Email: 'john@example.com' }
      ]);

      // Mock upsert to fail
      vi.doMock('../src/config/azure-services.js', () => ({
        initializeAzureServices: vi.fn().mockResolvedValue({
          cosmosDb: {
            upsertRecord: vi.fn().mockRejectedValue(new Error('Database error'))
          }
        })
      }));

      // Execute
      const result = await processExcelFile(mockFileBuffer, mockFileName, mockContainerName, mockUserId);

      // Verify
      expect(result.success).toBe(false); // Should fail if upserts fail
      expect(result.count).toBe(0); // But no records were processed
    });
  });
});
