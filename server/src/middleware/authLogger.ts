import { Request, Response, NextFunction } from 'express';

/**
 * Logs requests for debugging purposes
 */
export const authLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const { method, originalUrl, ip } = req;
  const userAgent = req.get('user-agent') || 'unknown';

  // Log request start
  console.log(`[Request] ${new Date().toISOString()} - ${method} ${originalUrl} - IP: ${ip} - User-Agent: ${userAgent}`);

  // Capture response finish
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    
    // Log request completion
    if (statusCode >= 400) {
      console.error(`[Request] ${new Date().toISOString()} - ERROR - Status: ${statusCode} - ${duration}ms`);
    } else if (req.path.includes('/api/')) {
      console.log(`[Request] ${new Date().toISOString()} - COMPLETE - Status: ${statusCode} - ${duration}ms`);
    }
  });

  next();
};

/**
 * Basic error handler for requests
 */
export const authErrorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  // Log the error
  console.error(`[Error] ${new Date().toISOString()} - Request Error:`, {
    error: err.message,
    path: req.path,
    method: req.method,
    ip: req.ip,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  // Send error response
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: 'An error occurred while processing your request',
    ...(process.env.NODE_ENV === 'development' && { details: err.message }),
  });
};
