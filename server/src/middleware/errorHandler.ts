import { Request, Response, NextFunction } from 'express';

interface ErrorResponse {
  success: boolean;
  error: string;
  message?: string;
  details?: unknown;
  stack?: string;
}

interface ExtendedError extends Error {
  statusCode?: number;
  status?: number;
  details?: unknown;
  code?: string;
}

/**
 * Error handling middleware for Express
 */
const errorHandler = (
  err: ExtendedError,
  req: Request,
  res: Response<ErrorResponse>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  // Log the error
  const logData: Record<string, unknown> = {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method
  };
  
  if (err.details) {
    logData.details = err.details;
  }
  
  console.error('Error:', logData);

  // Set status code from error or default to 500
  const statusCode = err.statusCode || err.status || 500;
  
  // Create error response
  const response: ErrorResponse = {
    success: false,
    error: statusCode >= 500 ? 'Internal Server Error' : 'Error',
    message: err.message || 'An unexpected error occurred'
  };
  
  if (process.env.NODE_ENV === 'development' && err.stack) {
    response.stack = err.stack;
  }

  // Handle specific error types
  switch (true) {
    case err.name === 'ValidationError':
      response.error = 'Validation Error';
      response.details = err.details || {};
      res.status(400).json(response);
      break;
      
    case err.name === 'UnauthorizedError':
      response.error = 'Unauthorized';
      response.message = err.message || 'Authentication required';
      res.status(401).json(response);
      break;
      
    case err.name === 'ForbiddenError':
      response.error = 'Forbidden';
      response.message = err.message || 'Insufficient permissions';
      res.status(403).json(response);
      break;
      
    case err.name === 'NotFoundError':
      response.error = 'Not Found';
      response.message = err.message || 'The requested resource was not found';
      res.status(404).json(response);
      break;
      
    case err.code === 'LIMIT_FILE_SIZE':
      response.error = 'File too large';
      response.message = `Maximum file size is ${process.env.FILE_SIZE_LIMIT || 10}MB`;
      res.status(413).json(response);
      break;
      
    case err.message?.includes('Invalid file type'):
      response.error = 'Invalid file type';
      response.message = err.message;
      response.details = {
        allowedTypes: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'text/csv'
        ]
      };
      res.status(400).json(response);
      break;
      
    default:
      res.status(statusCode).json(response);
  }
};

export default errorHandler;
