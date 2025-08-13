import express, { type Request, type Response, type NextFunction, type Express } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { logger } from '../utils/logger.js';
import { authLogger, authErrorHandler } from '../middleware/authLogger.js';

import { createV2Router } from '../routes/v2/index.js';
import { createFieldsRouter } from '../routes/fields.route.js';
import { createApiKeyRouter } from '../routes/apiKey.route.js';
import authRoute from '../routes/auth.route.js';
import type { AzureCosmosDB, AzureBlobStorage, CosmosClient, Database } from '../types/azure.js';

export function createApp(azureServices: { 
  cosmosDb: AzureCosmosDB; 
  blobStorage: AzureBlobStorage; 
  database: Database; 
  cosmosClient: CosmosClient; 
}): Express {
  const app = express();
  const env = process.env;

  // CORS configuration
  const allowedOrigins = env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(',') : [];
  const frontendUrl = env.FRONTEND_URL || 'https://gray-flower-09b086c00.6.azurestaticapps.net';
  if (allowedOrigins.indexOf(frontendUrl) === -1) {
    allowedOrigins.push(frontendUrl);
  }

  app.use(cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  }));

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Authentication and request logging
  app.use(authLogger);

  // Request logging middleware
  app.use((req: Request, _res: Response, next: NextFunction) => {
    logger.http(`Incoming request: ${req.method} ${req.originalUrl}`, {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    next();
  });

  // Error handling for authentication
  app.use(authErrorHandler);

  // Health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Public endpoint example
  app.get('/api/public', (_req: Request, res: Response) => {
    res.json({ message: 'This is a public endpoint' });
  });

  // Rate limiting configuration
  const apiRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes in production
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again after 15 minutes',
    keyGenerator: (req: Request) => req.ip || 'unknown-ip',
    handler: (_req: Request, res: Response) => {
      res.setHeader('Retry-After', '900'); // 15 minutes
      res.status(429).json({
        success: false,
        error: 'Too many requests',
        message: 'Too many requests from this IP, please try again after 15 minutes',
        retryAfter: 900,
      });
    },
    // Skip rate limiting for health check endpoints
    skip: (req: Request) => {
      const skipPaths = ['/api/health', '/api/auth/status'];
      return skipPaths.some(p => req.path.startsWith(p));
    }
  });

  // Apply rate limiting to all API routes, but skip in development
  app.use('/api', (req, res, next) => {
    if (process.env.NODE_ENV === 'development') {
      return next();
    }
    return apiRateLimit(req, res, next);
  });

  // API routes
  app.use('/api/v2', createV2Router(azureServices));
  
  // Temporary: Bypass auth for fields endpoint during debugging
  app.use('/api/fields', (_req, _res, next) => {
    console.log('Fields endpoint accessed - auth bypassed');
    next();
  }, createFieldsRouter(azureServices.cosmosDb));
  
  app.use('/api/auth', authRoute);
  
  // API Key management routes
  app.use('/api/keys', createApiKeyRouter(azureServices));

  // 404 handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: 'Not Found',
      message: 'The requested resource was not found',
    });
  });

  // Error handler
  app.use((err: Error & { statusCode?: number }, _req: Request, res: Response, _next: NextFunction) => {
    logger.error('Unhandled error:', { error: err });
    
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    
    res.status(statusCode).json({
      success: false,
      error: err.name || 'Error',
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  });

  return app;
}
