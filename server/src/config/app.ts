import express, { type Request, type Response, type NextFunction, type Express } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';
import { authLogger, authErrorHandler } from '../middleware/authLogger.js';

import { createV2Router } from '../routes/v2/index.js';
import { createFieldsRouter } from '../routes/fields.route.js';
import { createApiKeyRouter } from '../routes/apiKey.route.js';
import authRoute from '../routes/auth.route.js';
import type { AzureCosmosDB, AzureBlobStorage, CosmosClient, Database } from '../types/azure.js';
import { env } from './env.js';

// Import enhanced security middleware
import { securityHeaders, fileUploadLimits, requestId } from '../middleware/security.js';

export function createApp(azureServices: { 
  cosmosDb: AzureCosmosDB; 
  blobStorage: AzureBlobStorage; 
  database: Database; 
  cosmosClient: CosmosClient; 
}): Express {
  const app = express();

  // Add request ID middleware
  app.use(requestId());

  // Add security headers
  app.use(securityHeaders());

  // Add file upload limits
  app.use(fileUploadLimits());

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
  app.get('/health', async (_req: Request, res: Response) => {
    try {
      // Test Azure Storage connectivity
      let storageStatus = 'NOT TESTED';
      try {
        // Simple test: Check if the connection string is set
        if (process.env.AZURE_STORAGE_CONNECTION_STRING) {
          storageStatus = 'CONFIGURED';
          // You could add a more comprehensive test here if needed
        } else {
          storageStatus = 'MISSING CONNECTION STRING';
        }
      } catch (storageError) {
        storageStatus = `ERROR: ${(storageError as Error).message}`;
      }

      // Test Azure Cosmos DB connectivity
      let cosmosStatus = 'NOT TESTED';
      try {
        // Simple test: Check if the endpoint and key are set
        if (process.env.AZURE_COSMOSDB_ENDPOINT && process.env.AZURE_COSMOSDB_KEY) {
          cosmosStatus = 'CONFIGURED';
          // You could add a more comprehensive test here if needed
        } else {
          cosmosStatus = 'MISSING ENDPOINT OR KEY';
        }
      } catch (cosmosError) {
        cosmosStatus = `ERROR: ${(cosmosError as Error).message}`;
      }

      const healthStatus = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        azure: {
          storage: storageStatus,
          cosmos: cosmosStatus
        },
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: errorMessage
      });
    }
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
    // Use absolute path to avoid issues with working directory
    const staticPath = path.join(process.cwd(), 'server/dist/public');
    const indexPath = path.join(staticPath, 'index.html');
    
    // Serve static files with proper caching headers
    app.use(express.static(staticPath, {
      etag: true,
      lastModified: true,
      maxAge: '1y',
      setHeaders: (res, filePath) => {
        const ext = path.extname(filePath);
        // Set immutable cache for hashed assets
        if (['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.woff', '.woff2', '.ttf', '.eot'].includes(ext)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
        // Ensure proper MIME types
        if (ext === '.css') {
          res.setHeader('Content-Type', 'text/css');
        } else if (ext === '.js') {
          res.setHeader('Content-Type', 'application/javascript');
        } else if (ext === '.json') {
          res.setHeader('Content-Type', 'application/json');
        } else if (ext === '.html') {
          res.setHeader('Content-Type', 'text/html');
        }
        
        // Set Content Security Policy for static files
        const cspValue = 
          "default-src 'self'; " +
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://login.microsoftonline.com https://*.microsoft.com; " +
          "style-src 'self' 'unsafe-inline'; " +
          "img-src 'self' data: https:; " +
          "font-src 'self' data:; " +
          "connect-src 'self' https://login.microsoftonline.com https://*.microsoft.com; " +
          "media-src 'self'; " +
          "object-src 'none'; " +
          "child-src 'self'; " +
          "frame-ancestors 'none'; " +
          "form-action 'self'; " +
          "base-uri 'self';";
          
        res.setHeader('Content-Security-Policy', cspValue);
      }
    }));
      
      // Serve index.html for all other routes (client-side routing)
      app.get('*', (req: Request, res: Response) => {
        // Don't serve index.html for API routes
        if (req.path.startsWith('/api')) {
          return res.status(404).json({
            success: false,
            error: 'Not Found',
            message: 'The requested API resource was not found',
          });
        }
        
        // Send the main HTML file for all other routes
        return res.sendFile(path.join(staticPath, 'index.html'));
      });
    }

  // Error handler
  app.use((err: Error & { statusCode?: number }, _req: Request, res: Response, _next: NextFunction) => {
    logger.error('Unhandled error:', { error: err });
    
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    
    res.status(statusCode).json({
      status: 'error',
      statusCode,
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  });

  return app;
}
