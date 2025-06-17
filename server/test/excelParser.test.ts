import { processExcelFile } from '../src/routes/upload.route';
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';

// Mock the xlsx module
jest.mock('xlsx');

// Mock the Azure services
jest.mock('../src/config/azure', () => ({
  initializeAzureServices: jest.fn().mockResolvedValue({
    cosmosDb: {
      upsertRecord: jest.fn().mockImplementation((record) => Promise.resolve(record))
    }
  })
}));

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('test-uuid-123')
}));

describe('Excel Parser', () => {
  const mockFileBuffer = Buffer.from('test file content');
  const mockFileName = 'test.xlsx';
  const mockContainerName = 'test-container';
  const mockUserId = 'user-123';

  // Reset all mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
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

      (XLSX.read as jest.Mock).mockReturnValue(mockWorkbook);
      
      // Mock sheet_to_json to return test data
      (XLSX.utils as any).sheet_to_json.mockReturnValue([
        { Name: 'John', Age: 30, Email: 'john@example.com' },
        { Name: 'Jane', Age: 25, Email: 'jane@example.com' }
      ]);

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

      (XLSX.read as jest.Mock).mockReturnValue(mockWorkbook);
      (XLSX.utils as any).sheet_to_json.mockReturnValue([]);

      // Execute
      const result = await processExcelFile(mockFileBuffer, mockFileName, mockContainerName, mockUserId);

      // Verify
      expect(result.success).toBe(false);
      expect(result.error).toContain('No data found');
    });

    it('should handle parsing errors', async () => {
      // Setup mock to throw error
      (XLSX.read as jest.Mock).mockImplementation(() => {
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

      (XLSX.read as jest.Mock).mockReturnValue(mockWorkbook);
      (XLSX.utils as any).sheet_to_json.mockReturnValue([
        { Name: 'John', Age: 30, Email: 'john@example.com' }
      ]);

      // Mock upsert to fail
      const { initializeAzureServices } = require('../src/config/azure');
      initializeAzureServices.mockResolvedValueOnce({
        cosmosDb: {
          upsertRecord: jest.fn().mockRejectedValue(new Error('Database error'))
        }
      });

      // Execute
      const result = await processExcelFile(mockFileBuffer, mockFileName, mockContainerName, mockUserId);

      // Verify
      expect(result.success).toBe(true); // Should still succeed as we continue on record errors
      expect(result.count).toBe(0); // But no records were processed
    });
  });
});
