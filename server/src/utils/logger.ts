import winston from 'winston'; // WinstonLogger and LoggerOptions were imported but not used
import { Request as ExpressRequest, Response } from 'express';

// Define the user type
export interface AuthUser {
  oid?: string;
  name?: string;
  email?: string;
  roles?: string[];
  [key: string]: unknown; // Allow additional properties for flexibility
}

// Extend the Express Request type to include the user property
declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
  }
}

type Request = ExpressRequest;
import { v4 as uuidv4 } from 'uuid';
import { TransformableInfo } from 'logform';
import fs from 'fs';

// Ensure log directory exists
const logDir = 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

// Add colors to winston
winston.addColors(colors);

// Format for console logging
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info: TransformableInfo) => `${info.timestamp} [${info.level}]: ${info.message}`
  )
);

// Format for file logging
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.json()
);

// Define the logger interface with our custom log levels
export interface AppLogger extends winston.Logger {
  error: winston.LeveledLogMethod;
  warn: winston.LeveledLogMethod;
  info: winston.LeveledLogMethod;
  http: winston.LeveledLogMethod;
  debug: winston.LeveledLogMethod;
}

// Create logger instance
const logger: AppLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format: fileFormat,
  transports: [
    // Write all logs with importance level of 'error' or less to 'error.log'
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 5,
    }),
    // Write all logs with importance level of 'info' or less to 'combined.log'
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),
  ],
  // Don't exit on handled exceptions
  exitOnError: false,
}) as unknown as AppLogger;

// If we're not in production, log to the console as well
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat,
    }) as winston.transport
  );
}

// Request logging middleware
export const requestLogger = (req: Request, res: Response, next: () => void) => {
  // Skip health check logs in production to reduce noise
  if (req.path === '/health' && process.env.NODE_ENV === 'production') {
    return next();
  }

  const requestId = uuidv4();
  const start = Date.now();
  
  // Add request ID to response headers
  res.setHeader('X-Request-ID', requestId);
  
  // Log request start
  logger.http(`[${requestId}] ${req.method} ${req.originalUrl} - Request started`);
  
  // Log request body (except for sensitive data)
  if (Object.keys(req.body).length > 0 && req.path !== '/auth/login') {
    const loggableBody = { ...req.body };
    // Redact sensitive fields
    ['password', 'token', 'refreshToken', 'apiKey'].forEach((field) => {
      if (loggableBody[field]) {
        loggableBody[field] = '***REDACTED***';
      }
    });
    logger.debug(`[${requestId}] Request body: ${JSON.stringify(loggableBody)}`);
  }
  
  // Log query parameters
  if (Object.keys(req.query).length > 0) {
    logger.debug(`[${requestId}] Query params: ${JSON.stringify(req.query)}`);
  }
  
  // Log response when it's finished
  const originalSend = res.send;
  res.send = function (body) {
    const responseTime = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'http';
    
    logger.log({
      level: logLevel,
      message: `[${requestId}] ${req.method} ${req.originalUrl} - ${res.statusCode} (${responseTime}ms)`,
      requestId,
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      responseTime,
      user: req.user?.oid || 'anonymous',
      userAgent: req.get('user-agent'),
      ip: req.ip,
    });
    
    return originalSend.call(this, body);
  };
  
  next();
};

// API key usage logger
export const apiKeyLogger = (req: Request, res: Response, apiKeyId: string, isAuthenticated: boolean) => {
  const requestId = res.getHeader('X-Request-ID') || 'unknown';
  const logData = {
    apiKeyId,
    isAuthenticated,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    timestamp: new Date().toISOString(),
  };
  
  if (isAuthenticated) {
    logger.info(`[${requestId}] API key authenticated`, logData);
  } else {
    logger.warn(`[${requestId}] API key authentication failed`, logData);
  }
};

// Error logger
export const errorLogger = (error: Error, context: Record<string, unknown> = {}) => {
  const requestId = context.requestId || 'unknown';
  logger.error(`[${requestId}] ${error.message}`, {
    ...context,
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
    },
  });
};

// Export the logger instance
export { logger };

// Export types for request handler
export interface LogContext {
  requestId?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  responseTime?: number;
  ip?: string;
  userAgent?: string;
  userId?: string;
  error?: Error | string;
  stack?: string;
  
  [key: string]: unknown;
}
