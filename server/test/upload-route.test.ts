// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express, { Express, Request, Response, NextFunction } from 'express';
import { Readable } from 'stream';

// Hoist mock declarations to avoid hoisting issues
const mockUploadHandler = vi.hoisted(() => ({
  post: vi.fn()
}));

const mockInitializeAzureServices = vi.hoisted(() => vi.fn());

// Mock multer
const mockMulter = vi.hoisted(() => ({
  single: vi.fn().mockImplementation(() => (req: Request, res: Response, next: NextFunction) => {
    // Simulate multer's behavior of not setting req.file when no file is uploaded
    next();
  }),
  memoryStorage: vi.fn().mockReturnValue({
    _handleFile: vi.fn(),
    _removeFile: vi.fn()
  })
}));

// Import the actual router for testing
import uploadRouter from '../../src/routes/upload.route.js';

// Mock the upload handler
vi.mock('../../src/routes/upload.route.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    uploadHandler: mockUploadHandler
  };
});

// Mock the azure services
vi.mock('../../src/config/azure-services.js', () => ({
  __esModule: true,
  initializeAzureServices: mockInitializeAzureServices
}));

// Mock multer module
vi.mock('multer', () => ({
  __esModule: true,
  default: vi.fn(() => mockMulter)
}));

// Mock XLSX module
vi.mock('xlsx', () => mockXLSX);

// Helper function to create a mock Excel buffer
const createMockExcelBuffer = (): Buffer => {
  return Buffer.from('test');
};

// Helper function to create a test Express app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // Mock the upload route
  app.post('/api/upload', (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
        message: 'Please provide a file to upload'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'File uploaded successfully',
      data: []
    });
  });
  
  return app;
};



const mockXLSX = vi.hoisted(() => ({
  read: vi.fn(),
  utils: {
    sheet_to_json: vi.fn(),
    aoa_to_sheet: vi.fn()
  }
}));

describe('Upload Route', () => {
  console.log('Describe block is being executed');
  let app: Express;
  let req: any;
  let res: any;
  let next: any;

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    
    // Create a fresh Express app for each test
    app = express();
    app.use(express.json());
    
    // Initialize mock request and response objects
    req = {
      file: undefined,
      files: undefined,
      headers: {},
      body: {},
      params: {},
      query: {},
      method: 'POST',
      path: '/api/upload'
    };
    
    // Create properly typed mock response
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
      sendStatus: vi.fn().mockReturnThis()
    } as unknown as Response & {
      status: jest.Mock;
      json: jest.Mock;
      send: jest.Mock;
      sendStatus: jest.Mock;
    };
    
    next = vi.fn() as unknown as jest.Mock;
    
    // Apply the upload router
    app.use('/api/upload', uploadRouter);
  });

  beforeAll(() => {
    console.log('Setting up before all tests');
  });

  afterAll(() => {
    console.log('Cleaning up after all tests');
  });

  beforeEach(() => {
    console.log('Setting up before each test');
    app = createTestApp();
    vi.clearAllMocks();
  });

  afterEach(() => {
    console.log('Cleaning up after each test');
  });

  it('should run a simple test', () => {
    console.log('Running simple test');
    expect(true).toBe(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/upload', () => {
    it('should return 400 if no file is uploaded', async () => {
      // Mock multer to not set req.file
      mockMulter.single.mockImplementation(() => (req: Request, res: Response, next: NextFunction) => {
        (req as any).file = undefined;
        next();
      });

      const response = await request(app)
        .post('/api/upload')
        .set('Content-Type', 'multipart/form-data')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        statusCode: 400,
        error: 'No file uploaded',
        message: 'Please provide a file to upload'
      });
    });

    it('should return 401 if user is not authenticated', async () => {
      // Create a test app without the auth middleware
      const testApp = express();
      testApp.use(express.json());
      testApp.use('/api/upload', uploadRouter);

      const response = await request(testApp)
        .post('/api/upload')
        .set('Content-Type', 'multipart/form-data');

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        success: false,
        statusCode: 401,
        error: 'Authentication required'
      });
    });

    it('should process and upload a valid Excel file', async () => {
      // Mock the multer single file upload
      const mockFile = {
        buffer: createMockExcelBuffer(),
        originalname: 'test.xlsx',
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: 1024,
        fieldname: 'file',
        encoding: '7bit',
        destination: '',
        filename: 'test.xlsx',
        path: '/tmp/test.xlsx',
        stream: null
      } as Express.Multer.File;

      mockMulter.single.mockImplementation(() => (req: Request, res: Response, next: NextFunction) => {
        (req as any).file = mockFile;
        next();
      });

      // Mock Azure services
      const mockUploadResult = { 
        url: 'https://example.com/test.xlsx',
        name: 'test.xlsx',
        container: 'test-container',
        etag: 'test-etag',
        lastModified: new Date().toISOString()
      };
      
      const mockBlobStorage = {
        uploadFile: vi.fn().mockResolvedValue(mockUploadResult)
      };
      
      const mockCosmosDb = {
        upsertRecord: vi.fn().mockResolvedValue({})
      };

      (initializeAzureServices as jest.Mock).mockResolvedValue({
        blobStorage: mockBlobStorage,
        cosmosDb: mockCosmosDb
      });

      // Make the request
      const response = await request(app)
        .post('/api/upload')
        .set('Content-Type', 'multipart/form-data')
        .set('Authorization', 'Bearer test-token')
        .attach('file', createMockExcelBuffer(), 'test.xlsx');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        message: expect.stringContaining('successfully')
      });

      // Verify Azure services were called
      expect(mockBlobStorage.uploadFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          buffer: expect.any(Buffer),
          originalname: 'test.xlsx'
        })
      );
      expect(mockCosmosDb.upsertRecord).toHaveBeenCalled();
    });

    it('should return 400 for invalid file type', async () => {
      const invalidFile = {
        buffer: createMockExcelBuffer(),
        originalname: 'test.txt',
        mimetype: 'text/plain',
        size: 1024,
        fieldname: 'file',
        encoding: '7bit',
        destination: '',
        filename: 'test.txt',
        path: '/tmp/test.txt',
        stream: null
      } as Express.Multer.File;

      mockMulter.single.mockImplementation(() => (req: Request, res: Response, next: NextFunction) => {
        (req as any).file = invalidFile;
        next();
      });

      const response = await request(app)
        .post('/api/upload')
        .set('Content-Type', 'multipart/form-data')
        .set('Authorization', 'Bearer test-token')
        .attach('file', createMockExcelBuffer(), 'test.txt');

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: 'File processing failed',
        message: expect.stringContaining('Invalid file type')
      });
    });
  });
});
