import express, { type Request, type Response, type NextFunction, type Express } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';
import { authLogger, authErrorHandler } from '../middleware/authLogger.js';

import { createV2Router } from '../routes/v2/index.js';
import { createFieldsRouter } from '../routes/fields.route.js';
import { createApiKeyRouter } from '../routes/apiKey.route.js';
import authRoute from '../routes/auth.route.js';
import type { AzureCosmosDB, AzureBlobStorage, CosmosClient, Database } from '../types/azure.js';
import { env } from './env.js';

export function createApp(azureServices: { 
  cosmosDb: AzureCosmosDB; 
  blobStorage: AzureBlobStorage; 
  database: Database; 
  cosmosClient: CosmosClient; 
}): Express {
  const app = express();

  // CORS configuration
  const allowedOrigins = env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(',') : [];
  const frontendUrl = env.FRONTEND_URL || 'https://gray-flower-09b086c00.6.azurestaticapps.net';
  if (allowedOrigins.indexOf(frontendUrl) === -1) {
    allowedOrigins.push(frontendUrl);
  }

  // In production with auth disabled, allow all origins to avoid CORS issues
  const isProduction = process.env.NODE_ENV === 'production';
  const isAuthEnabled = env.AUTH_ENABLED === true;
  
  app.use(cors({
    origin: isProduction && !isAuthEnabled 
      ? '*' // Allow all origins in production when auth is disabled
      : allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: isProduction && !isAuthEnabled ? false : true // Disable credentials when allowing all origins
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
    const healthStatus = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      env: {
        NODE_ENV: process.env.NODE_ENV,
        PORT: process.env.PORT,
        AZURE_COSMOSDB_ENDPOINT: process.env.AZURE_COSMOSDB_ENDPOINT ? 'SET' : 'NOT SET',
        AZURE_COSMOSDB_KEY: process.env.AZURE_COSMOSDB_KEY ? 'SET' : 'NOT SET',
        AZURE_COSMOSDB_DATABASE: process.env.AZURE_COSMOSDB_DATABASE,
        AZURE_COSMOSDB_CONTAINER: process.env.AZURE_COSMOSDB_CONTAINER,
        AZURE_STORAGE_CONNECTION_STRING: process.env.AZURE_STORAGE_CONNECTION_STRING ? 'SET' : 'NOT SET',
      }
    };
    res.status(200).json(healthStatus);
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

  // API routes - all prefixed with /api to match frontend expectations
  app.use('/api/v2', createV2Router(azureServices));
  app.use('/api/fields', createFieldsRouter(azureServices.cosmosDb));
  app.use('/api/auth', authRoute);
  app.use('/api/keys', createApiKeyRouter(azureServices));

  // Serve static files in production
  if (process.env.NODE_ENV === 'production') {
    // Get the directory name in ES modules
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    // Serve static files from the dist directory (frontend build output)
    // When running from server/dist/src/config/, the path to dist is ../../../../dist
    const staticPath = path.join(__dirname, '../../../../dist');
    app.use(express.static(staticPath));
    
    // Handle client-side routing by serving index.html for all non-API routes
    app.get('*', (req: Request, res: Response) => {
      // Don't serve index.html for API routes
      if (req.path.startsWith('/api')) {
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'The requested API resource was not found',
        });
      }
      
      // Serve the index.html for all other routes (client-side routing)
      res.sendFile(path.join(staticPath, 'index.html'));
    });
  }

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
