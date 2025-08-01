/// <reference types="node" />
import express, { type Request, type Response, type NextFunction, type Express } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { Server } from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { initializeAzureServices } from './config/azure-services.js';

// Import v2 routes
import { createV2Router } from './routes/v2/index.js';

import { createFieldsRouter } from './routes/fields.route.js';
import { createApiKeyRouter } from './routes/apiKey.route.js';
import authRoute from './routes/auth.route.js';

import { requireAuthOrApiKey } from './middleware/authMiddleware.js';
import { authLogger, authErrorHandler } from './middleware/authLogger.js';
import * as authMiddleware from './middleware/auth.js';
import { logger, LogContext } from './utils/logger.js';

import { ApiKeyRepository } from './repositories/apiKeyRepository.js';
import { ApiKeyUsageRepository } from './repositories/apiKeyUsageRepository.js';
import type { AzureCosmosDB, AzureBlobStorage } from './types/azure.js';

// Load environment variables from server/.env file
const envPath = new URL('../../.env', import.meta.url);
try {
  dotenv.config({ path: fileURLToPath(envPath) });
  console.log(`Loaded environment variables from: ${envPath.pathname}`);
} catch (error: any) {
  console.error(`Failed to load environment variables from ${envPath.pathname}:`, error.message);
  // Do not exit in tests
  if (process.env.NODE_ENV !== 'test') {
    process.exit(1);
  }
}

// Server instance
let server: Server | null = null;
let app: Express | null = null;

/**
 * Create and configure the Express application
 */
function createApp(azureServices: { cosmosDb: AzureCosmosDB; blobStorage: AzureBlobStorage }): Express {
  const app = express();

  // Middleware
  app.use(cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  }));

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Authentication and request logging
  app.use(authLogger);

  // Request logging
  app.use((req: Request, res: Response, next: NextFunction) => {
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

  // Rate limit configuration
  const apiRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes in production
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again after 15 minutes',
    keyGenerator: (req: Request) => {
      return req.ip || 'unknown-ip';
    },
    handler: (req: Request, res: Response) => {
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
      return skipPaths.some(path => req.path.startsWith(path));
    }
  });

  // Apply rate limiting to all API routes, but skip in development
  app.use('/api', (req, res, next) => {
    if (process.env.NODE_ENV === 'development') {
      if (req.path.startsWith('/api/')) {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - Rate limiting disabled in development`);
      }
      return next();
    }

    if (req.path.startsWith('/api/auth/status')) {
      return next();
    }
    return apiRateLimit(req, res, next);
  });

  // Initialize repositories with Cosmos DB client
  const apiKeyRepository = new ApiKeyRepository(azureServices);
  const apiKeyUsageRepository = new ApiKeyUsageRepository(azureServices);

  // Setup authentication middleware with required dependencies
  const authOrApiKeyMiddleware = requireAuthOrApiKey({
    apiKeyRepository: apiKeyRepository,
    apiKeyUsageRepository: apiKeyUsageRepository
  });

  // API v2 routes
  app.use('/api/v2', createV2Router(azureServices.cosmosDb));

  // Fields endpoint (used by dashboard)
  console.log('server.ts: azureServices.cosmosDb before createFieldsRouter:', azureServices.cosmosDb);
  app.use('/api/fields', createFieldsRouter(azureServices.cosmosDb));

  // API Key routes (v2)
  app.use('/api/v2/keys', authMiddleware.authenticateToken, authOrApiKeyMiddleware, createApiKeyRouter(azureServices));

  // Auth route (v2)
  app.use('/api/v2/auth', authRoute);

  // Redirect root to API docs or health check
  app.get('/', (_req, res) => {
    res.redirect('/api/v2/health');
  });

  // Health check endpoints
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.get('/api/health', (_req, res) => res.json({ status: 'ok', version: 'v1' }));
  app.get('/api/v2/health', (_req, res) => res.json({ status: 'ok', version: 'v2' }));

  // Request logging middleware
  app.use((req: Request & { id?: string }, res, next) => {
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
  });

  // Example of a protected route with role-based access
  app.get('/api/protected', authMiddleware.authenticateToken, (req: Request, res: Response) => {
    res.json({
      message: 'This is a protected endpoint',
      user: req.user,
    });
  });

  // Error handling middleware
  const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction) => {
    const logContext: LogContext = {
      requestId: req.id,
      method: req.method,
      url: req.originalUrl,
      statusCode: 500,
      ip: req.ip,
      userId: req.user?.oid || 'anonymous',
      error: {
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
        name: err.name,
      },
    };

    logger.error('Unhandled error', logContext);

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      requestId: req.id
    });
  };

  app.use(errorHandler);

  // 404 handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: 'Not Found',
      message: 'The requested resource was not found.',
    });
  });
  return app;
}

// Get the port from environment variable with fallback (3001 for backend, different from frontend's 3000)
const getPort = (): number => {
  const port = process.env.PORT || '3001';
  if (!port) {
    const error = new Error('PORT environment variable is required');
    logger.error(error.message);
    throw error;
  }
  return parseInt(port, 10);
};

/**
 * Start the Express server
 */
async function startServer(port: number | string = getPort()): Promise<Server> {
  try {
    // --- Azure Startup Diagnostics ---
    console.log('--- Starting Azure App Service Diagnostics ---');
    console.log(`Node.js version: ${process.version}`);
    console.log(`Current working directory: ${process.cwd()}`);
    
    const wwwrootPath = path.resolve(process.cwd());
    console.log(`Resolved wwwroot path: ${wwwrootPath}`);
    console.log('Listing contents of wwwroot:');
    try {
      const rootContents = fs.readdirSync(wwwrootPath);
      console.log(rootContents.join('\n'));
    } catch (e: any) {
      console.error('Could not read wwwroot directory:', e.message);
    }

    const distPath = path.resolve(process.cwd(), 'dist');
    console.log(`\nChecking for dist directory at: ${distPath}`);
    if (fs.existsSync(distPath)) {
        console.log('`dist` directory exists. Contents:');
        const distContents = fs.readdirSync(distPath);
        console.log(distContents.join('\n'));
    } else {
        console.log('`dist` directory NOT FOUND.');
    }

    const serverJsPath = path.resolve(process.cwd(), 'dist/server/src/server.js');
    console.log(`\nChecking for server entry file at: ${serverJsPath}`);
    if (fs.existsSync(serverJsPath)) {
        console.log('✅ server.js entry file found.');
    } else {
        console.log('❌ server.js entry file NOT FOUND.');
    }

    console.log('\nEnvironment Variables:');
    console.log(`- PORT: ${process.env.PORT}`);
    console.log(`- NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`- WEBSITE_RUN_FROM_PACKAGE: ${process.env.WEBSITE_RUN_FROM_PACKAGE}`);
    console.log('--- End of Diagnostics ---');
    // --- End of Azure Startup Diagnostics ---

    logger.info('Initializing Azure services...');
    console.log('Initializing Azure services...');
    const azureServices = await initializeAzureServices();
    console.log('Azure services initialized successfully');

    app = createApp(azureServices);
    
    const expressApp = app;
    if (!expressApp) {
      throw new Error('Express app not initialized');
    }

    return new Promise((resolve, reject) => {
      const httpServer = expressApp.listen(port, () => {
        const address = httpServer.address();
        const serverAddress = typeof address === 'string' 
          ? address 
          : `http://${address?.address === '::' ? 'localhost' : address?.address}:${address?.port}`;
          
        logger.info('🚀 Server started successfully', {
          address: serverAddress,
          pid: process.pid,
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage()
        });
        
        console.log(`🚀 Server running at ${serverAddress} (PID: ${process.pid})`);
        resolve(httpServer);
      });
      
      httpServer.on('error', (error: NodeJS.ErrnoException) => {
        if (error.syscall !== 'listen') {
          logger.error('Server error:', error);
          reject(error);
          return;
        }

        switch (error.code) {
          case 'EACCES': {
            const eaccessError = new Error(`Port ${port} requires elevated privileges`);
            logger.error(eaccessError.message);
            reject(eaccessError);
            break;
          }
          case 'EADDRINUSE': {
            const eaddrinuseError = new Error(`Port ${port} is already in use`);
            logger.error(eaddrinuseError.message);
            reject(eaddrinuseError);
            break;
          }
          default: {
            logger.error('Server error:', error);
            reject(error);
          }
        }
      });
    });
  } catch (error: any) {
    console.error('❌ Failed to start server:', error.message);
    throw error;
  }
}

/**
 * Stop the Express server
 */
function stopServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (server) {
      server.close((err) => {
        if (err) {
          logger.error('Error stopping server:', err);
          return reject(err);
        }
        logger.info('Server stopped gracefully');
        server = null;
        resolve();
      });
    } else {
      resolve();
    }
  });
}

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  try {
    await stopServer();
    process.exit(0);
  } catch (error: any) {
    logger.error('Error during graceful shutdown:', error.message);
    process.exit(1);
  }
}

// Handle termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start the server if this file is run directly
const isMainModule = () => {
    const mainFile = process.argv[1];
    const currentFile = fileURLToPath(import.meta.url);
    return mainFile === currentFile;
}

if (isMainModule()) {
  (async () => {
    try {
      server = await startServer();
    } catch (error: any) {
      logger.error('Failed to start server:', error.message);
      process.exit(1);
    }
  })();
}

export { createApp, startServer, stopServer, app };
    // Create Express app with initialized services
    app = createApp(azureServices);
    
    // Start the HTTP server
    const expressApp = app; // Create a local constant to help TypeScript with type narrowing
    if (!expressApp) {
      throw new Error('Express app not initialized');
    }

    return new Promise((resolve, reject) => {
      const httpServer = expressApp.listen(port, () => {
        const address = httpServer.address();
        const serverAddress = typeof address === 'string' 
          ? address 
          : `http://${address?.address === '::' ? 'localhost' : address?.address}:${address?.port}`;
          
        logger.info('🚀 Server started successfully', {
          address: serverAddress,
          pid: process.pid,
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage()
        });
        
        console.log(`🚀 Server running at ${serverAddress} (PID: ${process.pid})`);
        resolve(httpServer);
      });
      
      httpServer.on('error', (error: NodeJS.ErrnoException) => {
        if (error.syscall !== 'listen') {
          logger.error('Server error:', error);
          reject(error);
          return;
        }

        // Handle specific listen errors with friendly messages
        switch (error.code) {
          case 'EACCES': {
            const eaccessError = new Error(`Port ${port} requires elevated privileges`);
            logger.error(eaccessError.message);
            reject(eaccessError);
            break;
          }
          case 'EADDRINUSE': {
            const eaddrinuseError = new Error(`Port ${port} is already in use`);
            logger.error(eaddrinuseError.message);
            reject(eaddrinuseError);
            break;
          }
          default: {
            logger.error('Server error:', error);
            reject(error);
          }
        }
      });
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    throw error;
  }
}

/**
 * Gracefully shut down the server
 */
async function shutdown(signal: string): Promise<void> {
  console.log(`\n${new Date().toISOString()} Received ${signal}. Shutting down gracefully...`);

  try {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server?.close((err) => {
          if (err) {
            console.error('Error closing server:', err);
            reject(err);
          } else {
            console.log('HTTP server closed');
            resolve();
          }
        });
      });
    }

    console.log('Shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
}

// Setup signal handlers for graceful shutdown
process.on('SIGTERM', () => shutdown('SIGTERM').catch(console.error));
process.on('SIGINT', () => shutdown('SIGINT').catch(console.error));

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Consider logging to an external service here
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Consider logging to an external service here
  process.exit(1);
});

// Start the server if this file is run directly
if (isMainModule) {
  startServer()
    .then((srv) => {
      server = srv;
    })
    .catch((error) => {
      console.error('Failed to start server:', error);
      process.exit(1);
    });
}

// Export the server instance and functions
export { createApp, startServer, shutdown };
