import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import * as XLSX from 'xlsx';
import type { Request, Response, NextFunction } from 'express';

// Hoist the mock multer implementation
const mockMulter = vi.hoisted(() => {
  const single = vi.fn().mockReturnValue((req: Request, res: Response, next: NextFunction) => {
    next();
  });
  
  // Create the memoryStorage function
  const memoryStorage = vi.fn().mockReturnValue({});
  
  // Create the multer mock function with the correct type
  const multer = vi.fn().mockImplementation(() => ({
    single,
    memoryStorage: vi.fn().mockReturnValue({}),
  })) as any; // Use type assertion here
  
  // Add static memoryStorage property to the multer function
  multer.memoryStorage = memoryStorage;
  
  return { multer, single, memoryStorage };
});

// Mock multer module
vi.mock('multer', () => ({
  __esModule: true,
  default: mockMulter.multer,
  memoryStorage: mockMulter.memoryStorage,
}));

// Import the function from the upload route
import { processExcelFile } from '../src/routes/upload.route.js';

// Mock the modules
vi.mock('xlsx', () => ({
  read: vi.fn(),
  utils: {
    sheet_to_json: vi.fn(),
    decode_range: vi.fn(),
    encode_cell: vi.fn()
  }
}));

vi.mock('uuid', () => ({
  v4: vi.fn().mockReturnValue('test-uuid-123')
}));

// Mock the Azure services using hoisted mocks
const mockCosmosDb = vi.hoisted(() => ({
  container: vi.fn().mockReturnValue({
    items: {
      query: vi.fn().mockResolvedValue({ resources: [] }),
      create: vi.fn().mockImplementation((item: any) => 
        Promise.resolve({ resource: { ...item, id: 'test-id' } })
      ),
      read: vi.fn().mockResolvedValue({ resource: null }),
      upsert: vi.fn().mockImplementation((item: any) => 
        Promise.resolve({ resource: item })
      ),
      delete: vi.fn().mockResolvedValue({ statusCode: 204 })
    }
  })
}));

vi.mock('@azure/cosmos', () => ({
  CosmosClient: vi.fn().mockImplementation(() => ({
    database: vi.fn().mockReturnThis(),
    container: vi.fn().mockReturnThis()
  }))
}));

// Mock blob storage
const mockBlobStorage = {
  blobServiceClient: {},
  getContainerClient: vi.fn(),
  uploadFile: vi.fn().mockResolvedValue({ url: 'http://example.com/test.xlsx' }),
  deleteFile: vi.fn().mockResolvedValue(true),
};

// Mock the Azure services using the hoisted mockCosmosDb
vi.mock('../src/config/azure-services.js', () => ({
  initializeAzureServices: vi.fn().mockResolvedValue({
    cosmosDb: mockCosmosDb,
    blobService: {
      getContainerClient: vi.fn().mockReturnThis(),
      uploadData: vi.fn().mockResolvedValue({})
    }
  })
}));

describe('Excel Parser', () => {
  // Test data
  const mockFileBuffer = Buffer.from('test file content');
  const mockFileName = 'test.xlsx';
  const mockContainerName = 'test-container';
  const mockUserId = 'user-123';
  
  // Module under test
  let azureServices: any;
  
  // Mock data and functions
  let mockUpsertRecord: ReturnType<typeof vi.fn>;
  let mockContainer: any;
  let mockCosmosDb: any;
  let mockBlobStorage: any;

  beforeAll(async () => {
    // Import modules
    azureServices = await import('../src/config/azure-services.js');
    // Import the module that contains processExcelFile
    await import('../src/routes/upload.route.js');
  });

  beforeEach(() => {
    // Setup mock implementations
    mockUpsertRecord = vi.fn().mockResolvedValue({});
    
    mockContainer = {
      items: {
        upsert: mockUpsertRecord,
      },
    };

    mockCosmosDb = {
      cosmosClient: {},
      container: vi.fn().mockResolvedValue(mockContainer),
      upsertRecord: mockUpsertRecord,
      query: vi.fn(),
      getById: vi.fn(),
      deleteRecord: vi.fn(),
    };

    mockBlobStorage = {
      blobServiceClient: {},
      getContainerClient: vi.fn(),
      uploadFile: vi.fn().mockResolvedValue({
        url: 'https://example.com/test.xlsx'
      }),
      deleteFile: vi.fn(),
    };
    
    // Setup default mock implementations
    (azureServices.initializeAzureServices as any).mockResolvedValue({
      cosmosDb: mockCosmosDb,
      blobStorage: mockBlobStorage,
    });

    // Mock XLSX.utils methods
    vi.spyOn(XLSX.utils, 'decode_range').mockReturnValue({ 
      s: { c: 0, r: 0 }, 
      e: { c: 2, r: 2 } 
    });
    vi.spyOn(XLSX.utils, 'encode_cell').mockImplementation(({ c, r }) => 
      `${String.fromCharCode(65 + c)}${r + 1}`
    );
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });
  
  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('processExcelFile', () => {
    it('should successfully process a valid Excel file', async () => {
      // Setup mock for XLSX.read
      const mockWorkbook = {
        Sheets: {
          'Sheet1': { 
            '!ref': 'A1:B3', 
            A1: { v: 'Name', t: 's' }, 
            B1: { v: 'Age', t: 's' }, 
            A2: { v: 'John', t: 's' }, 
            B2: { v: 30, t: 'n' }, 
            A3: { v: 'Jane', t: 's' }, 
            B3: { v: 25, t: 'n' }, 
          },
        },
        SheetNames: ['Sheet1']
      };

      // Mock XLSX.read to return our mock workbook
      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);

      // Mock XLSX.utils.sheet_to_json to return our test data in the expected format
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue([
        ['Name', 'Age'], // Headers
        ['John', 30],    // First data row
        ['Jane', 25]     // Second data row
      ]);

      // Mock XLSX.utils.decode_range
      vi.mocked(XLSX.utils.decode_range).mockReturnValue({
        s: { c: 0, r: 0 },
        e: { c: 1, r: 2 },
      });

      // Mock XLSX.utils.encode_cell
      vi.mocked(XLSX.utils.encode_cell).mockImplementation(({ c, r }) => {
        const col = String.fromCharCode(65 + c); // A, B, C, ...
        return `${col}${r + 1}`; // rows are 1-based in Excel
      });

      // Mock Cosmos DB upsert
      mockUpsertRecord.mockResolvedValue({});
      
      // Mock uuid
      vi.mock('uuid', () => ({
        v4: () => 'test-uuid',
      }));

      // Execute
      const result = await processExcelFile(mockFileBuffer, mockFileName, mockContainerName, mockUserId);

      // Verify
      expect(result).toEqual({
        success: true,
        count: 2,
        data: [
          {
            id: 'test-uuid',
            _partitionKey: mockUserId,
            fileName: mockFileName,
            containerName: mockContainerName,
            rowNumber: 2,
            uploadDate: expect.any(String),
            status: 'pending',
            Name: 'John',
            Age: 30
          },
          {
            id: 'test-uuid',
            _partitionKey: mockUserId,
            fileName: mockFileName,
            containerName: mockContainerName,
            rowNumber: 3,
            uploadDate: expect.any(String),
            status: 'pending',
            Name: 'Jane',
            Age: 25
          }
        ],
        headers: ['Name', 'Age'],
        rowCount: 2,
        columnCount: 2
      });
      
      expect(vi.mocked(XLSX.read)).toHaveBeenCalledWith(
        expect.any(Buffer),
        {
          type: 'buffer',
          cellDates: true,
          dateNF: 'yyyy-mm-dd'
        }
      );
    });

    it('should handle empty Excel files', async () => {
      // Setup mock for empty workbook
      const mockWorkbook = {
        Sheets: {
          'Sheet1': { 
            '!ref': 'A1:A1', // Empty sheet
            A1: { v: 'Name', t: 's' }, // Just header, no data
          },
        },
        SheetNames: ['Sheet1']
      };

      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue([]);
      vi.mocked(XLSX.utils.decode_range).mockReturnValue({
        s: { c: 0, r: 0 },
        e: { c: 0, r: 0 },
      });

      // Execute
      const result = await processExcelFile(mockFileBuffer, mockFileName, mockContainerName, mockUserId);

      // Verify
      expect(result.success).toBe(false);
      expect(result.error).toContain('No data rows found in the Excel file');
    });

    it('should handle parsing errors', async () => {
      // Mock XLSX.read to throw an error
      vi.mocked(XLSX.read).mockImplementation(() => {
        throw new Error('Invalid file format');
      });

      // Execute
      const result = await processExcelFile(mockFileBuffer, mockFileName, mockContainerName, mockUserId);

      // Verify
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid Excel file format');
    });

    it('should handle record processing errors gracefully', async () => {
      // Setup mock for valid workbook but failing upsert
      const mockWorkbook = {
        Sheets: {
          'Sheet1': { 
            '!ref': 'A1:C2',
            A1: { t: 's', v: 'Name' },
            B1: { t: 's', v: 'Age' },
            C1: { t: 's', v: 'Email' },
            A2: { t: 's', v: 'John' },
            B2: { t: 'n', v: 30 },
            C2: { t: 's', v: 'john@example.com' }
          }
        },
        SheetNames: ['Sheet1']
      };

      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue([
        { Name: 'John', Age: 30, Email: 'john@example.com' }
      ]);

      // Mock upsert to fail for this specific test
      const errorUpsertRecord = vi.fn().mockRejectedValue(new Error('Database error'));
      mockCosmosDb.container = vi.fn().mockResolvedValue({
        items: {
          upsert: errorUpsertRecord,
        },
      });
      mockCosmosDb.upsertRecord = errorUpsertRecord;

      // Execute
      const result = await processExcelFile(mockFileBuffer, mockFileName, mockContainerName, mockUserId);

      // Verify
      expect(result.success).toBe(false); // Should fail if upserts fail
      expect(result.count).toBe(0); // But no records were processed
    });
  });
});
