import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import request from 'supertest';
import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import multer from 'multer';
import type { TokenPayload } from '../src/middleware/auth';

// Extend Express Request type to include user and file
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
      file?: Express.Multer.File;
    }
  }
}

// Mock multer at the module level
vi.mock('multer', () => {
  const memoryStorage = {
    _handleFile: vi.fn(),
    _removeFile: vi.fn()
  };

  const single = vi.fn().mockImplementation((_fieldname: string) => {
    return (req: Request, _res: Response, next: NextFunction) => {
      // Default to no file - individual tests will override this as needed
      req.file = undefined;
      next();
    };
  });

  const multer = vi.fn().mockImplementation(() => ({
    single,
    array: vi.fn(),
    fields: vi.fn(),
    any: vi.fn(),
    none: vi.fn(),
    memoryStorage: vi.fn().mockReturnValue(memoryStorage)
  }));

  // Add static properties
  (multer as any).memoryStorage = vi.fn().mockReturnValue(memoryStorage);
  (multer as any).MulterError = class MulterError extends Error {
    code: string;
    field?: string;
    
    constructor(code: string, field?: string) {
      super(code);
      this.code = code;
      this.field = field;
      this.name = 'MulterError';
    }
  };

  return {
    default: multer,
    __esModule: true
  };
});

// Mock xlsx with a more complete implementation
const mockXLSX = {
  read: vi.fn().mockImplementation((buffer, options) => {
    // Verify the buffer and options match what we expect
    if (!Buffer.isBuffer(buffer)) {
      throw new Error('Expected a Buffer as input');
    }
    
    return {
      SheetNames: ['Sheet1'],
      Sheets: {
        Sheet1: {
          '!ref': 'A1:B2',
          '!cols': [{wch: 10}, {wch: 10}],
          '!rows': [{hpt: 15}, {hpt: 15}],
          A1: { v: 'Header1', t: 's' },
          B1: { v: 'Header2', t: 's' },
          A2: { v: 'Value1', t: 's' },
          B2: { v: 123, t: 'n' }
        }
      },
      Workbook: {
        SheetNames: ['Sheet1']
      }
    };
  }),
  utils: {
    sheet_to_json: vi.fn().mockImplementation((worksheet, options) => {
      // Return a simple 2D array that matches the test data
      return [
        ['Header1', 'Header2'],
        ['Value1', 123]
      ];
    })
  }
};

vi.mock('xlsx', () => mockXLSX);

// Import the actual implementation to properly mock it
const actualUploadRoute = await vi.importActual('../src/routes/upload.route');

// Mock the processExcelFile function to avoid actual file processing
vi.mock('../src/routes/upload.route', () => ({
  ...actualUploadRoute,
  processExcelFile: vi.fn().mockResolvedValue({
    success: true,
    count: 1,
    data: [{ Header1: 'Value1', Header2: 123 }],
    headers: ['Header1', 'Header2'],
    rowCount: 2,
    columnCount: 2
  })
}));

// Re-import to get the mocked version
const { uploadHandler } = await import('../src/routes/upload.route');

// Mock Azure services
vi.mock('../../src/services/azure', () => ({
  initializeAzureServices: vi.fn().mockResolvedValue({
    blobStorageService: {
      uploadFile: vi.fn().mockResolvedValue('https://example.com/test.xlsx')
    },
    cosmosDbService: {
      uploadData: vi.fn().mockResolvedValue({})
    },
    tableStorageService: {
      createEntity: vi.fn().mockResolvedValue({})
    }
  })
}));

// Mock the logger to suppress console output during tests
vi.mock('../../src/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}));

// Import the actual types after mocks are set up
import type { UploadResponse } from '../src/types/models';
import * as XLSX from 'xlsx';
import { uploadHandler, uploadRoute } from '../src/routes/upload.route';

// Mock the auth middleware to automatically authenticate
vi.mock('../../src/middleware/auth.js', () => ({
  authenticateToken: (req: Request, _res: Response, next: NextFunction) => {
    req.user = { id: 'test-user-id', oid: 'test-user-oid' }; // Simulate authenticated user
    next();
  }
}));

// Create a mock file with a more realistic Excel file buffer
const createMockFile = (overrides: Partial<Express.Multer.File> = {}): Express.Multer.File => {
  // Create a minimal Excel file buffer (this is just a placeholder - in a real test, you might want to use a real Excel file)
  const excelBuffer = Buffer.from([
    0x50, 0x4B, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00, 0x08, 0x00, 0x00, 0x00, 0x21, 0x00, 0x62, 0x74,
    0x4E, 0x3A, 0x02, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0x08, 0x00, 0x1C, 0x00, 0x5F, 0x72,
    0x65, 0x6C, 0x73, 0x2F, 0x2E, 0x72, 0x65, 0x6C, 0x73, 0x50, 0x4B, 0x01, 0x02, 0x1E, 0x03, 0x14,
    0x00, 0x02, 0x00, 0x08, 0x00, 0x00, 0x00, 0x21, 0x00, 0x62, 0x74, 0x4E, 0x3A, 0x02, 0x00, 0x00,
    0x00, 0x04, 0x00, 0x00, 0x00, 0x08, 0x00, 0x24, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x5F, 0x72, 0x65, 0x6C, 0x73, 0x2F, 0x2E, 0x72, 0x65,
    0x6C, 0x73, 0x50, 0x4B, 0x05, 0x06, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x2E, 0x00,
    0x00, 0x00, 0x3E, 0x00, 0x00, 0x00, 0x00, 0x00
  ]);
  
  return {
    fieldname: 'file',
    originalname: 'test.xlsx',
    encoding: '7bit',
    mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    size: 1024,
    destination: '',
    filename: 'test.xlsx',
    path: '/path/to/test.xlsx',
    buffer: excelBuffer,
    stream: null as any,
    ...overrides
  };
};

// Helper function to create a mock request
const createMockRequest = (file?: Express.Multer.File) => {
  return {
    file,
    user: { id: 'test-user-id', oid: 'test-user-oid' },
    body: {},
    query: {},
    headers: {
      'user-agent': 'vitest/1.0.0',
      'accept': 'application/json'
    },
    id: 'test-request-id'
  } as unknown as Request;
};

// Helper function to create a mock response
const createMockResponse = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  return res as Response;
};

// Helper function to create a mock next function
const createMockNext = () => vi.fn();

describe('Upload Handler', () => {
  let app: Express;
  let upload: ReturnType<typeof multer>;

  beforeAll(() => {
    // Set up multer with memory storage for testing
    const storage = multer.memoryStorage();
    upload = multer({ storage });
  });

  beforeEach(async () => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    
    // Create a new Express app for each test
    app = express();
    app.use(express.json());
    
    // Set up the upload route with the actual route handler
    // We'll use the router directly from the route file
    app.use('/api/upload', uploadRoute);
    
    // Error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error('Error in test app:', err);
      res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Internal server error',
        ...(err.code && { code: err.code })
      });
    });
  });

  afterEach(() => {
    // Clear all mocks after each test
    vi.clearAllMocks();
  });

  afterAll(() => {
    // Clean up after all tests
    vi.restoreAllMocks();
  });

  describe('POST /api/upload', () => {
    it('should return 400 if no file is uploaded (direct test)', async () => {
      // Arrange
      const req = createMockRequest(undefined);
      const res = createMockResponse();
      const next = createMockNext();

      // Act
      await uploadHandler(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'No file uploaded',
        message: 'Please provide a file to upload',
        statusCode: 400
      });
    });

    it('should process a valid file upload', async () => {
      // Arrange
      const file = createMockFile();
      const req = createMockRequest(file);
      const res = createMockResponse();
      const next = createMockNext();

      // Act
      await uploadHandler(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'File processed successfully',
          data: expect.any(Array),
          headers: expect.any(Array),
          rowCount: expect.any(Number),
          columnCount: expect.any(Number)
        })
      );
    });
  });
});
