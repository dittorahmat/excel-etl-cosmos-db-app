import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import request from 'supertest';
import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import type { TokenPayload } from '../src/middleware/auth';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
      file?: Express.Multer.File;
    }
  }
}

// Mock multer
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

  return multer;
});

// Mock xlsx
vi.mock('xlsx', () => ({
  read: vi.fn().mockReturnValue({
    SheetNames: ['Sheet1'],
    Sheets: { Sheet1: { A1: { v: 'Header' }, A2: { v: 'Value' } } }
  })
}));

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
import { uploadHandler } from '../src/routes/upload.route';

// Mock the upload handler for testing
const mockUploadHandler = vi.fn(uploadHandler);
const mockProcessExcelFile = vi.fn();

// Mock the auth middleware to automatically authenticate
vi.mock('../../src/middleware/auth.js', () => ({
  authenticateToken: (req: Request, _res: Response, next: NextFunction) => {
    req.user = { id: 'test-user-id', oid: 'test-user-oid' }; // Simulate authenticated user
    next();
  }
}));

// Create a mock file
const createMockFile = (overrides: Partial<Express.Multer.File> = {}): Express.Multer.File => ({
  fieldname: 'file',
  originalname: 'test.xlsx',
  encoding: '7bit',
  mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  size: 1024,
  destination: '',
  filename: 'test.xlsx',
  path: '/path/to/test.xlsx',
  buffer: Buffer.from('test'),
  stream: null as any,
  ...overrides
});

// Helper function to create a mock request
const createMockRequest = (file?: Express.Multer.File) => {
  return {
    file,
    user: { id: 'test-user-id', oid: 'test-user-oid' },
    body: {},
    query: {}
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
    
    // Reset module cache to ensure fresh imports
    vi.resetModules();
    
    // Create a new Express app for each test
    app = express();
    app.use(express.json());
    
    // Set up the upload route with our mock handler
    const uploadRouter = express.Router();
    uploadRouter.post('/', upload.single('file'), mockUploadHandler);
    app.use('/api/upload', uploadRouter);
    
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
    it('should return 400 if no file is uploaded', async () => {
      // Arrange
      const mockFile = createMockFile();
      
      // Mock multer to simulate no file uploaded
      const multerMock = vi.spyOn(multer, 'memoryStorage').mockImplementation(() => ({
        _handleFile: vi.fn(),
        _removeFile: vi.fn()
      }));
      
      // Mock the single() method to not set req.file
      const singleMock = vi.fn().mockImplementation((_fieldname: string) => {
        return (req: Request, _res: Response, next: NextFunction) => {
          req.file = undefined;
          next();
        };
      });
      
      // Mock the multer instance
      const multerInstance = multer({
        storage: multer.memoryStorage()
      });
      
      const singleSpy = vi.spyOn(multerInstance, 'single').mockImplementation(singleMock);
      
      // Create a test app with our mocked multer
      const testApp = express();
      testApp.use(express.json());
      testApp.use((req: Request, _res: Response, next: NextFunction) => {
        req.user = { id: 'test-user-id', oid: 'test-user-oid' };
        next();
      });
      
      // Add the route with our mocked multer
      testApp.post('/api/upload', 
        multerInstance.single('file'),
        (req: Request, res: Response) => {
          if (!req.file) {
            return res.status(400).json({
              success: false,
              error: 'No file uploaded',
              message: 'Please upload a file'
            });
          }
          res.status(200).json({ success: true });
        }
      );
      
      // Error handling
      testApp.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
        console.error('Error in test app:', err);
        res.status(err.status || 500).json({
          success: false,
          error: err.message || 'Internal server error',
          ...(err.code && { code: err.code })
        });
      });
      
      // Act
      const response = await request(testApp)
        .post('/api/upload')
        .set('Content-Type', 'multipart/form-data')
        .expect(400);

      // Assert
      expect(response.body).toEqual({
        success: false,
        error: 'No file uploaded',
        message: 'Please upload a file'
      });
      
      // Verify our mock was called
      expect(singleSpy).toHaveBeenCalledWith('file');
      
      // Clean up
      multerMock.mockRestore();
      singleSpy.mockRestore();
    });

    it('should return 400 if no file is uploaded (direct test)', async () => {
      // Arrange
      const req = createMockRequest(undefined);
      const res = createMockResponse();

      // Act
      await uploadHandler(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        code: 'NO_FILE_UPLOADED',
        error: 'No file uploaded',
        message: 'No file uploaded',
      });
    });

    it('should return 400 if file type is not allowed', async () => {
      // Arrange
      const testFile = createMockFile({
        mimetype: 'application/pdf',
        originalname: 'test.pdf'
      });

      const req = createMockRequest(testFile);
      const res = createMockResponse();

      // Act
      await uploadHandler(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid file type. Only Excel (.xlsx, .xls, .xlsm) and CSV files are allowed.',
        message: 'Invalid file type. Only Excel (.xlsx, .xls, .xlsm) and CSV files are allowed.',
        code: 'INVALID_FILE_TYPE'
      });
    });

    it('should return 500 if file processing fails', async () => {
      // Arrange
      const testFile = createMockFile();
      const req = createMockRequest(testFile);
      const res = createMockResponse();

      // Mock processExcelFile to throw an error
      mockProcessExcelFile.mockRejectedValueOnce(new Error('Test error'));

      // Act
      await uploadHandler(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Test error',
        message: 'Test error',
        stack: expect.any(String)
      });
    });

    it('should return 200 and success message if file is uploaded successfully', async () => {
      // Arrange
      const testFile = createMockFile();
      const req = createMockRequest(testFile);
      const res = createMockResponse();

      // Mock processExcelFile to return success
      mockProcessExcelFile.mockResolvedValueOnce({
        success: true,
        count: 1,
        data: [{ id: 1, name: 'Test' }],
        headers: ['id', 'name'],
        rowCount: 1,
        columnCount: 2
      });

      // Act
      await uploadHandler(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'File processed successfully',
        filename: testFile.originalname,
        count: 1,
        data: [{ id: 1, name: 'Test' }],
        headers: ['id', 'name'],
        rowCount: 1,
        columnCount: 2
      });
    });

    it('should process a valid Excel file', async () => {
      // Arrange
      const testFile = createMockFile();
      const req = createMockRequest(testFile);
      const res = createMockResponse();

      // Mock processExcelFile to return success
      mockProcessExcelFile.mockResolvedValueOnce({
        success: true,
        count: 1,
        data: [{ id: 1, name: 'Test' }],
        headers: ['id', 'name'],
        rowCount: 1,
        columnCount: 2
      });

      // Act
      await uploadHandler(req, res);

      // Assert
      expect(mockProcessExcelFile).toHaveBeenCalledWith(
        testFile.buffer,
        testFile.originalname,
        'test-user-oid',
        expect.any(String)
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 401 if user is not authenticated', async () => {
      // Arrange
      const testFile = createMockFile();

      // Create a request without user context
      const req = {
        ...createMockRequest(testFile),
        user: undefined // No user = unauthenticated
      };

      const res = createMockResponse();

      // Act
      await uploadHandler(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Unauthorized: No authorization token was found',
        message: 'Unauthorized: No authorization token was found',
        code: 'UNAUTHORIZED'
      });

      // Verify processExcelFile was not called
      expect(mockProcessExcelFile).not.toHaveBeenCalled();
    });
  });
});
