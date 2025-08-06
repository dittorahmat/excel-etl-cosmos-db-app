import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

interface LogContext {
  requestId?: string;
  method: string;
  url: string;
  statusCode: number;
  ip?: string;
  userId?: string;
  error?: {
    message: string;
    stack?: string;
    name: string;
  };
}

/**
 * Error handling middleware for Express
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const logContext: LogContext = {
    requestId: (req as any).id || 'unknown',
    method: req.method,
    url: req.originalUrl,
    statusCode: 500,
    ip: req.ip,
    userId: (req as any).user?.oid || 'anonymous',
    error: {
      message: err.message,
      stack: env.NODE_ENV === 'production' ? undefined : err.stack,
      name: err.name,
    },
  };

  logger.error('Unhandled error', logContext);

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    requestId: (req as any).id,
  });
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: 'The requested resource was not found.',
  });
}
