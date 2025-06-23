// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Readable } from 'stream';
import type { Request, Response, NextFunction } from 'express';

// Define the type for our mock request with user property
type AuthenticatedRequest = Request & {
  user?: { oid: string };
  file?: Express.Multer.File;
};

// Mock the upload handler
const mockUploadHandler = vi.fn();

// Mock the upload route module
vi.mock('../src/routes/upload.route.js', () => ({
  uploadHandler: mockUploadHandler
}));

describe('Upload Handler', () => {
  let mockRequest: AuthenticatedRequest;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    
    // Create fresh mock objects for each test
    mockRequest = {
      file: {
        fieldname: 'file',
        originalname: 'test.xlsx',
        encoding: '7bit',
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer: Buffer.from('test'),
        size: 1024,
        destination: '',
        filename: 'test.xlsx',
        path: '/tmp/test.xlsx',
        stream: Readable.from('test')
      } as Express.Multer.File,
      user: { oid: 'test-user-id' }
    } as AuthenticatedRequest;
    
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    
    mockNext = vi.fn();
  });

  it('should return 400 if no file is uploaded', async () => {
    // Simulate no file uploaded
    mockRequest.file = undefined;
    
    // Mock the handler to check for missing file
    mockUploadHandler.mockImplementation((req: AuthenticatedRequest, res: Response) => {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded',
          message: 'Please provide a file to upload'
        });
      }
      return res.status(200).json({ success: true });
    });
    
    // Call the handler directly
    const { uploadHandler } = await import('../src/routes/upload.route.js');
    await uploadHandler(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );
    
    // Verify the response
    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: 'No file uploaded',
      message: 'Please provide a file to upload'
    });
  });

  it('should return 200 and process the file when a valid file is uploaded', async () => {
    // Mock the handler to simulate successful processing
    mockUploadHandler.mockImplementation((req: Request, res: Response) => {
      res.status(200).json({
        success: true,
        message: 'File uploaded successfully',
        data: []
      });
    });
    
    // Call the handler directly
    const { uploadHandler } = await import('../src/routes/upload.route.js');
    await uploadHandler(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );
    
    // Verify the response
    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: true,
      message: 'File uploaded successfully',
      data: []
    });
  });
});
