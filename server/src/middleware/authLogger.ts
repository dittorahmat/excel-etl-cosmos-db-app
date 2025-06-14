import { Request, Response, NextFunction } from 'express';
import { TokenPayload } from './auth.js';

/**
 * Logs authentication attempts and errors
 */
export const authLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const { method, originalUrl, ip } = req;
  const userAgent = req.get('user-agent') || 'unknown';

  // Log request start
  console.log(`[Auth] ${new Date().toISOString()} - ${method} ${originalUrl} - IP: ${ip} - User-Agent: ${userAgent}`);

  // Capture response finish
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    const userId = (req.user as TokenPayload)?.oid || 'anonymous';
    
    // Log authentication result
    if (statusCode >= 400) {
      console.error(`[Auth] ${new Date().toISOString()} - FAILED - Status: ${statusCode} - User: ${userId} - ${duration}ms`);
      
      // Log additional error details if available
      if (res.locals.authError) {
        console.error(`[Auth] Error Details:`, res.locals.authError);
      }
    } else if (req.path.includes('/api/')) {
      console.log(`[Auth] ${new Date().toISOString()} - SUCCESS - Status: ${statusCode} - User: ${userId} - ${duration}ms`);
    }
  });

  next();
};

/**
 * Error handler for authentication failures
 */
export const authErrorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err.name === 'UnauthorizedError') {
    // Log the error
    console.error(`[Auth] ${new Date().toISOString()} - Authentication Error:`, {
      error: err.message,
      path: req.path,
      method: req.method,
      ip: req.ip,
    });

    // Set error in response locals for the logger
    res.locals.authError = {
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    };

    // Send appropriate error response
    res.status(401).json({
      error: 'Authentication Failed',
      message: 'Invalid or expired authentication token',
      code: 'UNAUTHORIZED',
    });
  } else {
    next(err);
  }
};
