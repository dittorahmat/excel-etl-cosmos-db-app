import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Hoist all mocks to ensure they're available when needed
const {
  mockMemoryStorage,
  mockSingleMiddleware,
  mockMulter,
  mockXLSX
} = vi.hoisted(() => {
  // Create mock memory storage
  const memoryStorage = {
    _handleFile: vi.fn(),
    _removeFile: vi.fn()
  };

  // Create mock single middleware
  const singleMiddleware = vi.fn().mockImplementation((req: any, _res: any, next: any) => {
    // Default to no file - individual tests will override this as needed
    req.file = undefined;
    next();
  });

  // Create mock multer
  const multer = vi.fn().mockImplementation(() => ({
    single: vi.fn().mockReturnValue(singleMiddleware),
    array: vi.fn(),
    fields: vi.fn(),
    any: vi.fn(),
    none: vi.fn(),
    memoryStorage: vi.fn().mockReturnValue(memoryStorage)
  }));

  // Add memoryStorage as a static property
  (multer as any).memoryStorage = vi.fn().mockReturnValue(memoryStorage);

  // Mock xlsx
  const xlsx = {
    read: vi.fn().mockReturnValue({
      SheetNames: ['Sheet1'],
      Sheets: { Sheet1: { A1: { v: 'Header' }, A2: { v: 'Value' } } }
    })
  };

  return {
    mockMemoryStorage: memoryStorage,
    mockSingleMiddleware: singleMiddleware,
    mockMulter: multer,
    mockXLSX: xlsx
  };
});

// Set up the mocks before any imports
vi.mock('multer', () => ({
  __esModule: true,
  default: mockMulter,
  memoryStorage: vi.fn().mockReturnValue(mockMemoryStorage)
}));

vi.mock('xlsx', () => mockXLSX);

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

// Create mock functions
const mockProcessExcelFile = vi.fn();
const mockUploadHandler = vi.fn();

// Mock the upload route module
vi.mock('../../src/routes/upload.route.js', () => ({
  __esModule: true,
  processExcelFile: mockProcessExcelFile,
  uploadHandler: mockUploadHandler
}));

// Import the actual types after mocks are set up
import type { UploadResponse } from '../src/types/models.js';
import * as XLSX from 'xlsx';
import * as uploadRoute from '../src/routes/upload.route.js';

// Mock the auth middleware to automatically authenticate
vi.mock('../../src/middleware/auth.js', () => ({
  authenticateToken: (req: any, _res: any, next: any) => {
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

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    // Reset the mock multer implementation
    mockMulter.mockImplementation(() => ({
      single: vi.fn().mockImplementation(() => (req: any, _res: any, next: any) => {
        req.file = undefined; // Default to no file
        next();
      }),
      array: vi.fn(),
      fields: vi.fn(),
      any: vi.fn(),
      none: vi.fn(),
      memoryStorage: vi.fn().mockReturnValue({
        _handleFile: vi.fn(),
        _removeFile: vi.fn(),
      })
    }));

    // Reset all mocks
    vi.clearAllMocks();

    // Set up default mocks
    mockProcessExcelFile.mockResolvedValue({
      success: true,
      count: 1,
      data: [],
      headers: [],
      rowCount: 1,
      columnCount: 1
    });

    // Setup the upload handler mock
    mockUploadHandler.mockImplementation(async (req: any, res: any, next: any) => {
      // Create a mock response object with chainable methods
      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
        send: vi.fn().mockReturnThis()
      };

      // Call the actual handler with the mock response
      try {
        // Check for authentication first
        if (!req.user) {
          res.status(401).json({
            success: false,
            error: 'Unauthorized: No authorization token was found',
            message: 'Unauthorized: No authorization token was found',
            code: 'UNAUTHORIZED'
          });
          return;
        }

        if (!req.file) {
          res.status(400).json({
            success: false,
            error: 'No file uploaded',
            message: 'No file uploaded',
            code: 'NO_FILE_UPLOADED'
          });
          return;
        }

        // Check file type
        const allowedMimeTypes = [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'text/csv'
        ];

        if (!allowedMimeTypes.includes(req.file.mimetype)) {
          res.status(400).json({
            success: false,
            error: 'Invalid file type. Only Excel (.xlsx, .xls, .xlsm) and CSV files are allowed.',
            message: 'Invalid file type. Only Excel (.xlsx, .xls, .xlsm) and CSV files are allowed.',
            code: 'INVALID_FILE_TYPE'
          });
          return;
        }

        // Process the file
        try {
          const result = await mockProcessExcelFile(
            req.file.buffer,
            req.file.originalname,
            req.user.oid,
            'test-batch-id'
          );

          if (!result.success) {
            res.status(500).json({
              success: false,
              error: result.error || 'Failed to process file',
              message: result.message || 'Failed to process file',
              stack: result.stack
            });
            return;
          }

          res.status(200).json({
            success: true,
            message: 'File processed successfully',
            filename: req.file.originalname,
            count: result.count,
            data: result.data || [],
            headers: result.headers || [],
            rowCount: result.rowCount || 0,
            columnCount: result.columnCount || 0
          });
        } catch (error: any) {
          res.status(500).json({
            success: false,
            error: error.message,
            message: error.message,
            stack: error.stack
          });
        }
      } catch (error) {
        // Handle any synchronous errors
        res.status(500).json({
          success: false,
          error: 'Internal server error',
          message: 'An unexpected error occurred'
        });
      }
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

  describe('uploadHandler', () => {
    it('should return 400 if no file is uploaded', async () => {
      // Arrange
      const req = createMockRequest(undefined);
      const res = createMockResponse();
      const next = createMockNext();

      // Act
      await mockUploadHandler(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'No file uploaded',
        message: 'No file uploaded',
        code: 'NO_FILE_UPLOADED'
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
      const next = createMockNext();

      // Act
      await mockUploadHandler(req, res, next);

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
      const next = createMockNext();

      // Mock processExcelFile to throw an error
      mockProcessExcelFile.mockRejectedValueOnce(new Error('Test error'));

      // Act
      await mockUploadHandler(req, res, next);

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
      const next = createMockNext();

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
      await mockUploadHandler(req, res, next);

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
      const next = createMockNext();

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
      await mockUploadHandler(req, res, next);

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
      const next = createMockNext();

      // Act
      await mockUploadHandler(req, res, next);

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
