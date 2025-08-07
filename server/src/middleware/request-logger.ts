import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import crypto from 'crypto';

// Uses the extended Express Request type from error-handler.ts

interface LogContext {
  requestId: string;
  method: string;
  path: string;
  ip?: string;
  userAgent?: string;
  status?: number;
  duration?: number;
  userId?: string;
}

/**
 * Request logging middleware for Express
 */
export function requestLogger() {
  return (req: Request & { id?: string }, res: Response, next: NextFunction) => {
    const start = Date.now();
    const requestId = crypto.randomUUID();

    // Add request ID to request object
    req.id = requestId;

    // Log request start
    logger.info(`Request started`, {
      requestId,
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    // Log response finish
    res.on('finish', () => {
      const duration = Date.now() - start;
      const logContext: LogContext = {
        requestId: req.id || 'unknown',
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration,
        userId: req.user?.oid || 'anonymous',
      };

      if (res.statusCode >= 400) {
        logger.warn(`Request completed with error`, logContext);
      } else {
        logger.info(`Request completed`, logContext);
      }
    });

    next();
  };
}
