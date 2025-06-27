/// <reference types="node" />
import express, { type Request, type Response, type NextFunction, type Express } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { Server } from 'http';
import rateLimit from 'express-rate-limit';
import { initializeAzureServices } from './config/azure-services.js';
import uploadRoute from './routes/upload.route.js';
import dataRoute from './routes/data.route.js';
import { createApiKeyRouter } from './routes/apiKey.route.js';
import { validateToken } from './middleware/auth.js';
import { requireAuthOrApiKey } from './middleware/authMiddleware.js';
import { authLogger, authErrorHandler } from './middleware/authLogger.js';
import { logger, LogContext } from './utils/logger.js';
import { ApiKeyRepository } from './repositories/apiKeyRepository.js';
import { ApiKeyUsageRepository } from './repositories/apiKeyUsageRepository.js';
import type { AzureCosmosDB, AuthenticatedRequest } from './types/custom.js';

// Load environment variables from .env file
dotenv.config();

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);


// Port configuration
const PORT = process.env.PORT || 3000;

/**
 * Create and configure the Express application
 */
function createApp(azureServices: AzureCosmosDB): Express {
  const app = express();

  // Middleware
  app.use(cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
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
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again after 15 minutes',
    keyGenerator: (req: Request) => {
      return req.ip || 'unknown-ip';
    },
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        error: 'Too many requests',
        message: 'Too many requests from this IP, please try again after 15 minutes',
      });
    },
  });

  // Apply rate limiting to all API routes
  app.use('/api', apiRateLimit);

  // Initialize repositories with Cosmos DB client
  

  

  // Initialize repositories with Cosmos DB client
  const apiKeyRepository = new ApiKeyRepository(azureServices);
  const apiKeyUsageRepository = new ApiKeyUsageRepository(azureServices);

  // Initialize repositories with Cosmos DB client
  const apiKeyRepository = new ApiKeyRepository(azureServices);
  const apiKeyUsageRepository = new ApiKeyUsageRepository(azureServices);

  // Setup authentication middleware with required dependencies
  const authMiddleware = requireAuthOrApiKey({
    apiKeyRepository: apiKeyRepository,
    apiKeyUsageRepository: apiKeyUsageRepository
  });

  // Apply authentication middleware to specific routes
  const protectedRoutes = ['/api/keys', '/api/upload', '/api/data'];
  protectedRoutes.forEach(route => {
    app.use(route, (req: Request, res: Response, next: NextFunction) => {
          // Use type assertion to bypass TypeScript type checking for the middleware
      return (authMiddleware as (req: Request, res: Response, next: NextFunction) => void)(req, res, next);
    });
  });

  // Routes with proper typing
  app.use('/api/keys', createApiKeyRouter(azureServices));
  app.use('/api/upload', uploadRoute);
  app.use('/api/data', dataRoute);

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
      const authReq = req as unknown as AuthenticatedRequest;
      const logContext: LogContext = {
        requestId: req.id || 'unknown',
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration,
        userId: authReq.user?.oid || 'anonymous',
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
  app.get('/api/protected', validateToken, (req: Request, res: Response) => {
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
      userId: (req as AuthenticatedRequest).user?.oid || 'anonymous',
      error: err.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
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

// Start the server if this file is run directly
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

// Server instance
let server: Server;
let app: Express;

/**
 * Start the Express server
 */
async function startServer(port: number | string = PORT): Promise<Server> {
  try {
    logger.info('Initializing Azure services...');
    console.log('Initializing Azure services...');
    const { cosmosDb } = await initializeAzureServices();
    console.log('Azure services initialized successfully');

    // Create Express application
    

    logger.info('Repositories initialized');

    // Create Express app with initialized services
    app = createApp(cosmosDb);

    // Start the HTTP server
    return new Promise((resolve, reject) => {
      const httpServer = app.listen(port, () => {
        logger.info(`🚀 Server ready at http://localhost:${port}`);
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
          case 'EACCES':
            logger.error(`Port ${port} requires elevated privileges`);
            process.exit(1);
            break;
          case 'EADDRINUSE':
            logger.error(`Port ${port} is already in use`);
            process.exit(1);
            break;
          default:
            reject(error);
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
