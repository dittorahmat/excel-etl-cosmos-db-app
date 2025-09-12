import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as XLSX from 'xlsx';
import { processExcelFile } from '../src/utils/excelParser.js';
import { v4 as uuidv4 } from 'uuid';

// Mock the XLSX and uuid modules
vi.mock('xlsx', () => ({
  read: vi.fn(),
  utils: {
    sheet_to_json: vi.fn(),
    decode_range: vi.fn(),
    encode_cell: vi.fn()
  }
}));

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
    const mockWorkbook = {
      SheetNames: ['Sheet1'],
      Sheets: {
        Sheet1: {},
      },
    };
    const mockJsonData = [
      ['Header1', 'Header2', 'Header3'],
      ['Value1A', 'Value1B', 'Value1C'],
      ['Value2A', 'Value2B', 'Value2C'],
    ];

    vi.mocked(XLSX.read).mockReturnValue(mockWorkbook as any);
    vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(mockJsonData as any);

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
    vi.mocked(XLSX.read).mockImplementation(() => {
      throw new Error('Invalid file');
    });

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
    const mockWorkbook = {
      SheetNames: [],
      Sheets: {},
    };
    vi.mocked(XLSX.read).mockReturnValue(mockWorkbook as any);

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
    const mockWorkbook = {
      SheetNames: ['Sheet1'],
      Sheets: {
        Sheet1: {},
      },
    };
    const mockJsonData = [['Header1', 'Header2']]; // Only headers, no data rows

    vi.mocked(XLSX.read).mockReturnValue(mockWorkbook as any);
    vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(mockJsonData as any);

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
    const mockWorkbook = {
      SheetNames: ['Sheet1'],
      Sheets: {
        Sheet1: {},
      },
    };
    const mockJsonData = [
      ['Header1', 'Header2', 'Header3'],
      ['Value1A', null, 'Value1C'],
      [undefined, 'Value2B', null],
    ];

    vi.mocked(XLSX.read).mockReturnValue(mockWorkbook as any);
    vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(mockJsonData as any);

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
    vi.mocked(XLSX.read).mockReturnValue({
      SheetNames: ['Sheet1'],
      Sheets: { Sheet1: {} },
    } as any);
    vi.mocked(XLSX.utils.sheet_to_json).mockImplementation(() => {
      throw new Error('Unexpected processing error');
    });

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