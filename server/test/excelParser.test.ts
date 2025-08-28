import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Workbook } from 'exceljs';
import { processExcelFile } from '../src/utils/excelParser.js';
import { v4 as uuidv4 } from 'uuid';

// Mock the exceljs and uuid modules
vi.mock('exceljs', () => {
  return {
    Workbook: vi.fn().mockImplementation(() => {
      return {
        xlsx: {
          load: vi.fn().mockResolvedValue(undefined)
        },
        worksheets: [{
          getSheetValues: vi.fn().mockReturnValue([
            ['Header1', 'Header2', 'Header3'],
            ['Value1A', 'Value1B', 'Value1C'],
            ['Value2A', 'Value2B', 'Value2C'],
          ])
        }],
        addWorksheet: vi.fn().mockReturnThis()
      };
    })
  };
});

vi.mock('uuid', () => ({
  v4: vi.fn()
}));

describe('processExcelFile', () => {
  const mockFileBuffer = Buffer.from('mock-excel-data');
  const mockFileName = 'test.xlsx';
  const mockContainerName = 'test-container';
  const mockUserId = 'user123';

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    vi.mocked(uuidv4).mockReturnValue('mock-uuid');
    vi.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error during tests
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should successfully process a valid Excel file', async () => {
    // Mock the workbook to return specific data
    const mockWorkSheet = {
      getSheetValues: vi.fn().mockReturnValue([
        ['Header1', 'Header2', 'Header3'],
        ['Value1A', 'Value1B', 'Value1C'],
        ['Value2A', 'Value2B', 'Value2C'],
      ])
    };
    
    const mockWorkbook = {
      worksheets: [mockWorkSheet],
      xlsx: {
        load: vi.fn().mockResolvedValue(undefined)
      }
    };
    
    (Workbook as any).mockImplementation(() => mockWorkbook);

    const result = await processExcelFile(
      mockFileBuffer,
      mockFileName,
      mockContainerName,
      mockUserId
    );

    expect(result.success).toBe(true);
    expect(result.count).toBe(2);
    expect(result.headers).toEqual(['Header1', 'Header2', 'Header3']);
    expect(result.rowCount).toBe(2);
    expect(result.columnCount).toBe(3);
    expect(result.data).toHaveLength(2);
    expect(result.data![0]).toEqual(
      expect.objectContaining({
        id: 'mock-uuid',
        _partitionKey: mockUserId,
        fileName: mockFileName,
        containerName: mockContainerName,
        rowNumber: 2,
        status: 'pending',
        Header1: 'Value1A',
        Header2: 'Value1B',
        Header3: 'Value1C',
      })
    );
    expect(result.data![1]).toEqual(
      expect.objectContaining({
        id: 'mock-uuid',
        _partitionKey: mockUserId,
        fileName: mockFileName,
        containerName: mockContainerName,
        rowNumber: 3,
        status: 'pending',
        Header1: 'Value2A',
        Header2: 'Value2B',
        Header3: 'Value2C',
      })
    );
    expect(result.data![0].uploadDate).toBeDefined();
    expect(result.data![1].uploadDate).toBeDefined();
  });

  it('should return an error for an invalid Excel file format', async () => {
    // Mock the workbook to throw an error when loading
    const mockWorkbook = {
      xlsx: {
        load: vi.fn().mockRejectedValue(new Error('Invalid file'))
      }
    };
    
    (Workbook as any).mockImplementation(() => mockWorkbook);

    const result = await processExcelFile(
      mockFileBuffer,
      mockFileName,
      mockContainerName,
      mockUserId
    );

    expect(result.success).toBe(false);
    expect(result.count).toBe(0);
    expect(result.error).toBe('Invalid Excel file format');
    expect(console.error).toHaveBeenCalledWith('Error parsing Excel file:', expect.any(Error));
  });

  it('should return an error if no worksheets are found', async () => {
    // Mock the workbook to have no worksheets
    const mockWorkbook = {
      worksheets: [],
      xlsx: {
        load: vi.fn().mockResolvedValue(undefined)
      }
    };
    
    (Workbook as any).mockImplementation(() => mockWorkbook);

    const result = await processExcelFile(
      mockFileBuffer,
      mockFileName,
      mockContainerName,
      mockUserId
    );

    expect(result.success).toBe(false);
    expect(result.count).toBe(0);
    expect(result.error).toBe('No worksheets found in the Excel file');
  });

  it('should return an error if no data rows are found (only headers)', async () => {
    // Mock the workbook to return only headers
    const mockWorkSheet = {
      getSheetValues: vi.fn().mockReturnValue([
        ['Header1', 'Header2']
      ])
    };
    
    const mockWorkbook = {
      worksheets: [mockWorkSheet],
      xlsx: {
        load: vi.fn().mockResolvedValue(undefined)
      }
    };
    
    (Workbook as any).mockImplementation(() => mockWorkbook);

    const result = await processExcelFile(
      mockFileBuffer,
      mockFileName,
      mockContainerName,
      mockUserId
    );

    expect(result.success).toBe(false);
    expect(result.count).toBe(0);
    expect(result.error).toBe('No data rows found in the Excel file');
  });

  it('should handle null and undefined cell values correctly', async () => {
    // Mock the workbook to return data with null and undefined values
    const mockWorkSheet = {
      getSheetValues: vi.fn().mockReturnValue([
        ['Header1', 'Header2', 'Header3'],
        ['Value1A', null, 'Value1C'],
        [undefined, 'Value2B', null],
      ])
    };
    
    const mockWorkbook = {
      worksheets: [mockWorkSheet],
      xlsx: {
        load: vi.fn().mockResolvedValue(undefined)
      }
    };
    
    (Workbook as any).mockImplementation(() => mockWorkbook);

    const result = await processExcelFile(
      mockFileBuffer,
      mockFileName,
      mockContainerName,
      mockUserId
    );

    expect(result.success).toBe(true);
    expect(result.count).toBe(2);
    expect(result.data![0].Header2).toBeNull();
    expect(result.data![1].Header1).toBeNull();
    expect(result.data![1].Header3).toBeNull();
  });

  it('should return a general error if an unexpected error occurs during processing', async () => {
    // Mock the workbook to throw an error during processing
    const mockWorkSheet = {
      getSheetValues: vi.fn().mockImplementation(() => {
        throw new Error('Unexpected processing error');
      })
    };
    
    const mockWorkbook = {
      worksheets: [mockWorkSheet],
      xlsx: {
        load: vi.fn().mockResolvedValue(undefined)
      }
    };
    
    (Workbook as any).mockImplementation(() => mockWorkbook);

    const result = await processExcelFile(
      mockFileBuffer,
      mockFileName,
      mockContainerName,
      mockUserId
    );

    expect(result.success).toBe(false);
    expect(result.count).toBe(0);
    expect(result.error).toBe('Unexpected processing error');
    expect(console.error).toHaveBeenCalledWith('Error processing Excel file:', expect.any(Error));
  });
});