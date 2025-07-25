/// <reference types="node" />
import express, { type Request, type Response, type NextFunction, type Express } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { Server } from 'http';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { initializeAzureServices } from './config/azure-services.js';
// Import v1 routes
import dataRoute from './routes/data.route.js';
import authRoute from './routes/auth.route.js';
import { createApiKeyRouter } from './routes/apiKey.route.js';

// Import v2 routes
import v2Router from './routes/v2/index.js';
import { uploadRouterV2 as uploadRoute } from './routes/v2/upload.route.js';
import fieldsRoute from './routes/fields.route.js';
import { validateToken } from './middleware/auth.js';
import { requireAuthOrApiKey } from './middleware/authMiddleware.js';
import { authLogger, authErrorHandler } from './middleware/authLogger.js';
import { logger, LogContext } from './utils/logger.js';
import { authRateLimiter } from './middleware/rateLimit.js';
import { ApiKeyRepository } from './repositories/apiKeyRepository.js';
import { ApiKeyUsageRepository } from './repositories/apiKeyUsageRepository.js';
import type { AzureCosmosDB } from './types/custom.js';

// Load environment variables from .env file
dotenv.config();

console.log('AUTH_ENABLED from process.env:', process.env.AUTH_ENABLED);

// Environment flags - prefix with _ to indicate it's used in middleware


// Debug log environment variables
console.log('Environment variables:');
console.log('AZURE_COSMOS_ENDPOINT:', process.env.AZURE_COSMOS_ENDPOINT ? '***' : 'Not set');
console.log('AZURE_COSMOS_KEY:', process.env.AZURE_COSMOS_KEY ? '***' : 'Not set');
console.log('AZURE_COSMOS_DATABASE:', process.env.AZURE_COSMOS_DATABASE || 'Not set');
console.log('AZURE_COSMOS_CONTAINER:', process.env.AZURE_COSMOS_CONTAINER || 'Not set');

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);

// Port configuration
const PORT = process.env.PORT || 3001;

// Server instance
let server: Server | null = null;
let app: Express | null = null;



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
  const authMiddleware = requireAuthOrApiKey({
    apiKeyRepository: apiKeyRepository,
    apiKeyUsageRepository: apiKeyUsageRepository
  });

  // Check if authentication is enabled
  const authEnabled = process.env.AUTH_ENABLED === 'true';
  
  // Public routes (no authentication required)
  // Register auth route with conditional rate limiting
  

  // Public routes (no authentication required)
  if (authEnabled) {
    logger.info('Authentication is ENABLED. Protecting API routes.');
    // Apply auth rate limiting if authentication is enabled and not in development
    if (!(process.env.NODE_ENV === 'development')) {
      app.use('/api/auth', authRateLimiter, authRoute);
    } else {
      app.use('/api/auth', authRoute);
    }
    
    // Apply auth middleware to protected routes
    app.use('/api/keys', 
      authMiddleware, 
      createApiKeyRouter(azureServices)
    );
    
    app.use('/api/upload', 
      authMiddleware, 

    );
    
    app.use('/api/data', 
      authMiddleware, 
      dataRoute
    );
  } else {
    if (process.env.NODE_ENV !== 'test') {
      logger.warn('Authentication is DISABLED. All API routes are UNPROTECTED.');
    }
    app.use('/api/auth', authRoute); // Always allow auth route without rate limiting if auth is disabled
    
    // API v1 routes (legacy)
    const apiKeyRouter = createApiKeyRouter(azureServices);
    app.use('/api/keys', apiKeyRouter);
    
    app.use('/api/data', dataRoute);
    app.use('/api', apiKeyRouter);
  }

  // Register auth route with conditional rate limiting
  if (authEnabled && !(process.env.NODE_ENV === 'development')) {
    app.use('/api/auth', authRateLimiter, authRoute);
  } else {
    app.use('/api/auth', authRoute);
  }

  // API v2 routes
  app.use('/api/v2', v2Router);
  
  // Mount the v2 upload route at /api/v2/query/imports
  app.use('/api/v2/query/imports', uploadRoute);
  
  // Fields endpoint (used by dashboard)
  app.use('/api/fields', fieldsRoute);
  
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

// Start the server if this file is run directly
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);


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
    const expressApp = app; // Create a local constant to help TypeScript with type narrowing
    if (!expressApp) {
      throw new Error('Express app not initialized');
    }
    
    return new Promise((resolve, reject) => {
      const httpServer = expressApp.listen(port, () => {
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
          default:
            logger.error('Server error:', error);
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
