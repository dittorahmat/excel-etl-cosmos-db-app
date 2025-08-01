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

// Middleware
import { requireAuthOrApiKey } from './middleware/authMiddleware.js';
import { authLogger, authErrorHandler } from './middleware/authLogger.js';
import * as authMiddleware from './middleware/auth.js';
import { logger, LogContext } from './utils/logger.js';

// Repositories
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
    keyGenerator: (req: Request) => req.ip || 'unknown-ip',
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
      return skipPaths.some(p => req.path.startsWith(p));
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
    apiKeyRepository,
    apiKeyUsageRepository
  });

  // API v2 routes
  app.use('/api/v2', createV2Router(azureServices.cosmosDb));

  // Fields endpoint (used by dashboard)
  console.log('server.ts: azureServices.cosmosDb before createFieldsRouter:', azureServices.cosmosDb);
  app.use('/api/fields', createFieldsRouter(azureServices.cosmosDb));

  // API Key routes (v2)
  app.use('/api/v2/keys', 
    authMiddleware.authenticateToken, 
    authOrApiKeyMiddleware, 
    createApiKeyRouter(azureServices)
  );

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
        userId: (req as any).user?.oid || 'anonymous',
      };

      if (res.statusCode >= 400) {
        logger.warn(`Request completed with error`, logContext);
      } else {
        logger.info(`Request completed`, logContext);
      }
    });

    next();
  });

  // Protected route example
  app.get('/api/protected', authMiddleware.authenticateToken, (req: Request, res: Response) => {
    res.json({
      message: 'This is a protected endpoint',
      user: (req as any).user,
    });
  });

  // Error handling middleware
  const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction) => {
    const logContext: LogContext = {
      requestId: (req as any).id || 'unknown',
      method: req.method,
      url: req.originalUrl,
      statusCode: 500,
      ip: req.ip,
      userId: (req as any).user?.oid || 'anonymous',
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
      requestId: (req as any).id
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
  // Log all environment variables for debugging (except sensitive ones)
  console.log('Environment variables:');
  Object.keys(process.env)
    .filter(key => !key.toLowerCase().includes('key') && !key.toLowerCase().includes('secret') && !key.toLowerCase().includes('password'))
    .forEach(key => {
      console.log(`  ${key} = ${process.env[key]}`);
    });

  // Check for Azure App Service specific port
  const azurePort = process.env.WEBSITES_PORT || process.env.PORT;
  const port = azurePort || '3001';
  
  console.log(`Using port: ${port} (from ${azurePort ? 'AZURE' : 'DEFAULT'})`);
  
  if (!port) {
    const error = new Error('PORT environment variable is required');
    logger.error(error.message);
    throw error;
  }
  
  const portNumber = parseInt(port, 10);
  
  // Log the port being used
  console.log(`Server will start on port: ${portNumber}`);
  
  return portNumber;
};

/**
 * Start the Express server
 */
async function startServer(port: number | string = getPort()): Promise<Server> {
  try {
    // --- Azure Startup Diagnostics ---
    console.log('=== Azure App Service Startup Diagnostics ===');
    console.log(`Node.js version: ${process.version}`);
    console.log(`Current working directory: ${process.cwd()}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Log Azure-specific environment variables
    const azureVars = Object.keys(process.env).filter(key => 
      key.startsWith('WEBSITE_') || 
      key.startsWith('APPSETTING_') ||
      key === 'PORT' || 
      key === 'WEBSITES_PORT' ||
      key === 'SCM_DO_BUILD_DURING_DEPLOYMENT' ||
      key === 'WEBSITE_NODE_DEFAULT_VERSION' ||
      key === 'WEBSITE_RUN_FROM_PACKAGE' ||
      key === 'AZURE_CLIENTSECRET' // This will be masked in logs
    );
    
    console.log('\n=== Azure Environment Variables ===');
    azureVars.forEach(key => {
      const value = key.includes('SECRET') || key.includes('KEY') ? '*****' : process.env[key];
      console.log(`${key} = ${value}`);
    });
    
    // Check for required directories and files
    const checkPath = (pathToCheck: string, isDir = true) => {
      try {
        const stats = fs.statSync(pathToCheck);
        if (isDir && !stats.isDirectory()) {
          throw new Error(`Not a directory: ${pathToCheck}`);
        }
        console.log(`✓ ${pathToCheck} exists (${(stats.size / 1024).toFixed(2)} KB)`);
        return true;
      } catch (_error) {
        console.error(`✗ ${pathToCheck} does not exist or is not accessible`);
        return false;
      }
    };

    console.log('\n=== Checking Directory Structure ===');
    const wwwrootPath = path.resolve(process.cwd());
    console.log(`\nCurrent directory: ${wwwrootPath}`);
    
    // List contents of current directory
    try {
      console.log('\nDirectory contents:');
      const rootContents = fs.readdirSync(wwwrootPath);
      console.log(rootContents.join('\n'));
    } catch (e: any) {
      console.error('Could not read directory contents:', e.message);
    }

    // Check for dist directory and its contents
    const distPath = path.resolve(process.cwd(), 'dist');
    console.log(`\nChecking for dist directory at: ${distPath}`);
    
    if (checkPath(distPath)) {
      console.log('\nDist directory contents:');
      try {
        const distContents = fs.readdirSync(distPath);
        console.log(distContents.join('\n'));
        
        // Check for server.js in dist directory
        const serverJsPath = path.join(distPath, 'server.js');
        if (fs.existsSync(serverJsPath)) {
          console.log(`\nFound server.js at: ${serverJsPath}`);
          console.log(`File size: ${(fs.statSync(serverJsPath).size / 1024).toFixed(2)} KB`);
        } else {
          console.error('\nERROR: server.js not found in dist directory!');
          console.log('Available files in dist:');
          fs.readdirSync(distPath).forEach(file => {
            console.log(`- ${file}`);
          });
        }
      } catch (e: any) {
        console.error('Could not read dist directory:', e.message);
      }
    } else {
      console.log('`dist` directory NOT FOUND.');
    }

    const serverJsPath = path.resolve(process.cwd(), 'dist/server/src/server.js');
    console.log(`\nChecking for server entry file at: ${serverJsPath}`);
    
    try {
      if (fs.existsSync(serverJsPath)) {
        console.log('✅ server.js entry file found.');
        console.log(`File size: ${fs.statSync(serverJsPath).size} bytes`);
      } else {
        console.log('❌ server.js entry file NOT FOUND.');
      }
    } catch (e: any) {
      console.error('Error checking server entry file:', e.message);
    }

    console.log('\nEnvironment Variables:');
    console.log(`- PORT: ${process.env.PORT}`);
    console.log(`- NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`- WEBSITE_RUN_FROM_PACKAGE: ${process.env.WEBSITE_RUN_FROM_PACKAGE}`);
    console.log('--- End of Diagnostics ---');
    // --- End of Azure Startup Diagnostics ---

    logger.info('Initializing Azure services...');
    console.log('Initializing Azure services...');
    
    // Log Azure-specific configurations
    console.log('\n=== Azure App Service Configuration ===');
    console.log(`- WEBSITES_PORT: ${process.env.WEBSITES_PORT || 'Not set'}`);
    console.log(`- PORT: ${process.env.PORT || 'Not set'}`);
    console.log(`- WEBSITE_NODE_DEFAULT_VERSION: ${process.env.WEBSITE_NODE_DEFAULT_VERSION || 'Not set'}`);
    console.log(`- WEBSITE_RUN_FROM_PACKAGE: ${process.env.WEBSITE_RUN_FROM_PACKAGE || 'Not set'}`);
    console.log(`- SCM_DO_BUILD_DURING_DEPLOYMENT: ${process.env.SCM_DO_BUILD_DURING_DEPLOYMENT || 'Not set'}`);
    
    // Log the final port being used
    console.log(`\n=== Starting Server on Port ${port} ===`);
    
    try {
      // Initialize Azure services
      console.log('Initializing Azure services...');
      const azureServices = await initializeAzureServices();
      console.log('Azure services initialized successfully');
      
      // Create Express app
      console.log('Creating Express application...');
      app = createApp(azureServices);
      console.log('Express application created');
      
      // Start the server
      return new Promise<Server>((resolve, reject) => {
        try {
          console.log(`Starting HTTP server on port ${port}...`);
          
          // Set a timeout for server startup
          const startupTimeout = setTimeout(() => {
            console.error('\n❌ Server startup timed out. Possible issues:');
            console.error('1. The application might be listening on a different port than expected');
            console.error('2. The application might be crashing during startup');
            console.error('3. The application might be stuck in an infinite loop');
            console.error('\nCheck the logs above for any errors during startup.');
            
            // Try to get the list of running processes using this port
            console.log('\nChecking for processes using this port...');
            try {
                    // Check for processes using the port
              const checkPortProcesses = async () => {
                try {
                  const { execSync } = await import('child_process');
                  const result = execSync(`lsof -i :${port} || netstat -ano | findstr :${port}`, { stdio: 'pipe' });
                  console.log('Processes using this port:', result.toString());
                } catch (_error: unknown) {
                  console.log('Could not check for processes using the port');
                }
              };
              
              // Run the check without using top-level await
              checkPortProcesses().catch(console.error);
            } catch (_error: unknown) {
              console.log('Could not check for processes using the port');
            }
            
            reject(new Error(`Server startup timed out after 30 seconds`));
          }, 30000);
          
          // Create a new server instance
          if (!app) {
            const error = new Error('Express application not initialized');
            console.error('❌ Failed to start server:', error.message);
            reject(error);
            return;
          }
          
          const httpServer = app.listen(port, () => {
            clearTimeout(startupTimeout);
            
            // Update the server variable after it's created
            server = httpServer;
            
            const address = httpServer.address();
            const host = address && typeof address !== 'string' ? 
              `${address.address}:${address.port}` : 
              `port ${port}`;
              
            console.log(`\n✅ Server is running on ${host}`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`Time: ${new Date().toISOString()}`);
            console.log(`Process ID: ${process.pid}`);
            console.log(`Node.js version: ${process.version}`);
            console.log(`Platform: ${process.platform} ${process.arch}`);
            console.log(`Memory usage: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`);
            
            // Log all routes
            console.log('\n=== Available Routes ===');
            if (app) {
              const routes: string[] = [];
              app._router.stack.forEach((middleware: any) => {
                if (middleware.route) {
                  // Routes registered directly on the app
                  routes.push(`${Object.keys(middleware.route.methods).join(', ').toUpperCase()} ${middleware.route.path}`);
                } else if (middleware.name === 'router') {
                  // Routes added as router
                  middleware.handle.stack.forEach((handler: any) => {
                    if (handler.route) {
                      routes.push(`${Object.keys(handler.route.methods).join(', ').toUpperCase()} ${handler.route.path}`);
                    }
                  });
                }
              });
              
              if (routes.length > 0) {
                console.log(routes.sort().join('\n'));
              } else {
                console.log('No routes found. Make sure your routes are properly registered.');
              }
            }
            
            console.log('\n✅ Server started successfully!');
            console.log('=== End of Startup Logs ===\n');
            
            // Resolve with the httpServer instance which is guaranteed to be defined here
            resolve(httpServer);
          });
          
          // Assign the server to the module-level variable
          server = httpServer;
          
          // Handle server errors
          server.on('error', (error: NodeJS.ErrnoException) => {
            clearTimeout(startupTimeout);
            
            console.error('\n❌ Server error:', error);
            
            if (error.syscall !== 'listen') {
              console.error('Non-listen error occurred:', error);
              reject(error);
              return;
            }
            
            // Handle specific listen errors with friendly messages
            switch (error.code) {
              case 'EACCES':
                console.error(`\n❌ Port ${port} requires elevated privileges`);
                console.error('Please run the server with administrator/root privileges or use a port above 1024');
                break;
              case 'EADDRINUSE':
                console.error(`\n❌ Port ${port} is already in use`);
                console.error('Another application is already using this port.');
                console.log('\nTo find and stop the process using this port, run:');
                console.log(`  lsof -i :${port}  # On macOS/Linux`);
                console.log(`  netstat -ano | findstr :${port}  # On Windows`);
                break;
              case 'EADDRNOTAVAIL':
                console.error(`\n❌ Cannot assign requested address ${port}`);
                console.error('The specified IP address or hostname is not available');
                break;
              default:
                console.error('An unknown error occurred while starting the server');
            }
            
            // Additional diagnostics
            console.log('\n=== Additional Diagnostics ===');
            console.log(`- Current working directory: ${process.cwd()}`);
            console.log(`- Node.js version: ${process.version}`);
            console.log(`- Platform: ${process.platform} ${process.arch}`);
            console.log(`- Environment: ${process.env.NODE_ENV || 'development'}`);
            
            reject(error);
          });
        } catch (error) {
          console.error('\n❌ Failed to start server:', error);
          reject(error);
        }
      });
    } catch (error: any) {
      console.error('❌ Failed to start server:', error.message);
      if (error.stack) {
        console.error(error.stack);
      }
      throw error;
    }
  } catch (error: any) {
    console.error('❌ Failed to start server:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    throw error;
  }
}

// ... (rest of the code remains the same)
/**
 * Stop the Express server
 */
async function stopServer(): Promise<void> {
  if (!server) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    server!.close((err) => {
      if (err) {
        logger.error('Error stopping server:', err);
        return reject(err);
      }
      logger.info('Server stopped gracefully');
      server = null;
      resolve();
    });
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
};

// Only start the server if this file is run directly
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
