import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import express, { Router } from 'express';
import request from 'supertest';

// Enable debug logging
const debug = process.env.DEBUG === 'true';
const log = debug ? console.log : () => {};

// Define mock functions using vi.fn() directly in the mock implementation
vi.mock('../src/config/azure-services.js', () => {
  // These will be hoisted to the top
  const mockUploadFile = vi.fn();
  const mockUpsertRecord = vi.fn();
  const mockDeleteFile = vi.fn();

  return {
    __esModule: true,
    initializeAzureServices: vi.fn().mockResolvedValue({
      blobStorage: {
        uploadFile: mockUploadFile,
        deleteFile: mockDeleteFile
      },
      cosmosDb: {
        container: {
          items: {
            upsert: mockUpsertRecord
          }
        },
        upsertRecord: mockUpsertRecord
      }
    }),
    // Export mocks for test access
    mockUploadFile,
    mockUpsertRecord,
    mockDeleteFile,
    __mocks: {
      mockUploadFile,
      mockUpsertRecord,
      mockDeleteFile
    }
  };
});

// Get references to the mocks for test access
let mockUploadFile: ReturnType<typeof vi.fn>;
let mockUpsertRecord: ReturnType<typeof vi.fn>;
let mockDeleteFile: ReturnType<typeof vi.fn>;

beforeAll(async () => {
  const mocks = (await vi.importMock('../src/config/azure-services.js') as any).__mocks;
  mockUploadFile = mocks.mockUploadFile;
  mockUpsertRecord = mocks.mockUpsertRecord;
  mockDeleteFile = mocks.mockDeleteFile;
});

// Mock the multer module with a factory function
vi.mock('multer', () => {
  // Create a mutable object to hold our mock implementation
  const mocks = {
    single: vi.fn().mockImplementation(() => (req: any, res: any, next: any) => {
      // Default behavior - sets req.file
      req.file = {
        fieldname: 'file',
        originalname: 'test.xlsx',
        encoding: '7bit',
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer: Buffer.from('test'),
        size: 1024,
        destination: '',
        filename: 'test.xlsx',
        path: '/tmp/test.xlsx',
        stream: null as any
      };
      next();
    })
  };

  const mockMulter = vi.fn().mockImplementation(() => ({
    single: mocks.single
  }));

  // Add static methods
  (mockMulter as any).memoryStorage = vi.fn().mockReturnValue({});

  // Return both default and named exports
  return {
    __esModule: true,
    default: mockMulter,
    ...mockMulter,
    // Export mocks for test-specific overrides
    _mocks: mocks
  };
});

// Get the mock instance for test-specific overrides
const getMulterMocks = async () => {
  const multer = await import('multer');
  return (multer as any)._mocks;
};

// Helper to reset all mocks
const resetAzureMocks = () => {
  mockUploadFile.mockClear().mockResolvedValue({
    url: 'https://example.com/test.xlsx',
    name: 'test.xlsx',
    container: 'test-container',
    etag: 'test-etag',
    lastModified: new Date().toISOString()
  });

  mockUpsertRecord.mockClear().mockResolvedValue({
    id: 'test-id',
    _partitionKey: 'test-user-id',
    fileName: 'test.xlsx',
    uploadDate: new Date().toISOString(),
    _etag: 'test-etag',
    _rid: 'test-rid',
    _self: 'test-self',
    _ts: Math.floor(Date.now() / 1000)
  });

  mockDeleteFile.mockClear().mockResolvedValue(true);
};


// Mock the authenticateToken middleware
vi.mock('../src/middleware/auth.js', () => ({
  authenticateToken: vi.fn().mockImplementation((req: any, _res: any, next: any) => {
    req.user = { oid: 'test-user-id' };
    return next();
  })
}));

// Reset all mocks before each test
beforeEach(() => {
  resetAzureMocks();
});



// Mock XLSX
vi.mock('xlsx', () => ({
  read: vi.fn().mockReturnValue({
    SheetNames: ['Sheet1'],
    Sheets: {
      Sheet1: {
        '!ref': 'A1:B2',
        A1: { v: 'Header1' },
        B1: { v: 'Header2' },
        A2: { v: 'Value1' },
        B2: { v: 'Value2' }
      }
    }
  }),
  utils: {
    sheet_to_json: vi.fn().mockReturnValue([
      { Header1: 'Value1', Header2: 'Value2' }
    ]),
    decode_range: vi.fn().mockReturnValue({ s: { c: 0, r: 0 }, e: { c: 1, r: 1 } }),
    encode_cell: vi.fn().mockReturnValue('A1')
  }
}));

import uploadRouter, { uploadHandler } from '../src/routes/upload.route.js';
// Import the mocked module as a namespace for mock assertions
import * as azureServicesMock from '../src/config/azure-services.js';
// --- E2E supertest-based tests only ---
describe('Upload Route', () => {
  describe('POST /upload', () => {
    it('should process and upload a valid Excel file', async () => {
      const app = express();
      app.use(express.json());
      app.use((req, res, next) => {
        req.user = { oid: 'test-user-id' };
        next();
      });
      app.use('/upload', uploadRouter);
      const testFile = Buffer.from('test content');
      const response = await request(app)
        .post('/upload')
        .attach('file', testFile, 'test.xlsx')
        .set('Content-Type', 'multipart/form-data')
        .set('Authorization', 'Bearer test-token');
      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          message: expect.any(String),
          data: expect.objectContaining({
            fileName: 'test.xlsx',
            blobUrl: 'https://example.com/test.xlsx'
          })
        })
      );
      expect((azureServicesMock as any).mockUploadFile).toHaveBeenCalled();
      expect((azureServicesMock as any).mockUpsertRecord).toHaveBeenCalled();
    });

    it('should return 400 if no file is uploaded', async () => {
      // Create a minimal mock request object without a file
      const mockReq = {
        file: undefined, // Explicitly set to undefined
        user: { oid: 'test-user-id' },
        body: {},
        method: 'POST',
        url: '/upload',
        headers: {},
      } as any;

      // Create a minimal mock response object
      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
        set: vi.fn().mockReturnThis(),
        sendStatus: vi.fn(),
      } as any;

      // Create a mock next function
      const mockNext = vi.fn();

      // Call the handler directly
      await uploadHandler(mockReq, mockRes, mockNext);

      // Verify the response
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'No file uploaded',
          message: 'No file uploaded',
        })
      );

      // Verify next was not called with an error
      expect(mockNext).not.toHaveBeenCalledWith(expect.any(Error));

      // Verify no Azure services were called
      expect(mockUploadFile).not.toHaveBeenCalled();
      expect(mockUpsertRecord).not.toHaveBeenCalled();

      // Also verify no other unexpected calls were made
      expect(mockRes.sendStatus).not.toHaveBeenCalled();
    });
  });
})

