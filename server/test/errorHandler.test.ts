import { Request, Response, NextFunction } from 'express';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import errorHandler from '../src/middleware/errorHandler';

// Mock Express request, response, and next function
const mockRequest = {} as Request;
const mockResponse = (): Response => {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res as Response);
  res.json = vi.fn().mockReturnValue(res as Response);
  return res as Response;
};

const mockNext = vi.fn() as NextFunction;

describe('Error Handler Middleware', () => {

    let mockRes: Response;

  beforeEach(() => {
    mockRes = mockResponse();
    vi.clearAllMocks();
  });

  it('should handle generic errors with a 500 status code', () => {
    const error = new Error('Something went wrong');
    errorHandler(error, mockRequest, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      error: 'Internal Server Error',
      message: 'Something went wrong',
    });
  });

  it('should handle validation errors with a 400 status code', () => {
    const error = {
      name: 'ValidationError',
      message: 'Invalid input',
      details: { field: 'email', message: 'is required' },
    };
    errorHandler(error, mockRequest, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      error: 'Validation Error',
      message: 'Invalid input',
      details: { field: 'email', message: 'is required' },
    });
  });

  it('should handle unauthorized errors with a 401 status code', () => {
    const error = { name: 'UnauthorizedError', message: 'Token expired' };
    errorHandler(error, mockRequest, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      error: 'Unauthorized',
      message: 'Token expired',
    });
  });

  it('should handle forbidden errors with a 403 status code', () => {
    const error = { name: 'ForbiddenError', message: 'Admin access required' };
    errorHandler(error, mockRequest, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      error: 'Forbidden',
      message: 'Admin access required',
    });
  });

  it('should handle not found errors with a 404 status code', () => {
    const error = { name: 'NotFoundError', message: 'User not found' };
    errorHandler(error, mockRequest, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      error: 'Not Found',
      message: 'User not found',
    });
  });

  it('should handle file size limit errors with a 413 status code', () => {
    const error = { code: 'LIMIT_FILE_SIZE', message: 'File too large' };
    errorHandler(error, mockRequest, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(413);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      error: 'File too large',
      message: 'Maximum file size is 10MB',
    });
  });

  it('should handle invalid file type errors with a 400 status code', () => {
    const error = { message: 'Invalid file type: application/pdf' };
    errorHandler(error, mockRequest, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      error: 'Invalid file type',
      message: 'Invalid file type: application/pdf',
      details: {
        allowedTypes: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'text/csv',
        ],
      },
    });
  });

  it('should include stack trace in development environment', () => {
    process.env.NODE_ENV = 'development';
    const error = new Error('Something went wrong');
    error.stack = 'Error stack trace';
    errorHandler(error, mockRequest, mockRes, mockNext);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      stack: 'Error stack trace',
    }));
    process.env.NODE_ENV = 'test'; // Reset NODE_ENV
  });
});
