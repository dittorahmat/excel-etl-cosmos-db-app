import express, { type Request, type Response, type NextFunction, type Express } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'http';
import { initializeAzureServices } from './config/azure.js';
import uploadRoute from './routes/upload.route.js';
import errorHandler from './middleware/errorHandler.js';
import { validateToken } from './middleware/auth.js';
import { authLogger, authErrorHandler } from './middleware/authLogger.js';

// Load environment variables from .env file
dotenv.config();

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Port configuration
const PORT = process.env.PORT || 3000;

/**
 * Create and configure the Express application
 */
function createApp(): Express {
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
  app.use((req: Request, _res: Response, next: NextFunction) => {
    console.log(`[Request] ${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });
  
  // Error handling for authentication
  app.use(authErrorHandler);

  // Health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  });

  // Public routes
  app.get('/api/public', (_req: Request, res: Response) => {
    res.json({ message: 'This is a public endpoint' });
  });

  // Protected API routes with authentication
  app.use('/api/upload', validateToken, uploadRoute);

  // Example of a protected route with role-based access
  app.get('/api/protected', validateToken, (req: Request, res: Response) => {
    res.json({
      message: 'This is a protected endpoint',
      user: req.user
    });
  });

  // Serve static files in production
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../../dist')));
    
    // Handle SPA routing
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, '../../dist/index.html'));
    });
  }

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: 'Not Found',
      message: `Cannot ${req.method} ${req.path}`
    });
  });

  // Error handling middleware (must be last)
  app.use(errorHandler);

  return app;
};

/**
 * Start the Express server
 */
async function startServer(port: string | number = process.env.PORT || 3000): Promise<Server> {
  const app = createApp();
  
  try {
    // Initialize Azure services
    await initializeAzureServices();
    
    // Start the server
    const server = app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
    
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err: Error) => {
      console.error('Unhandled Rejection:', err);
      if (server) {
        server.close(() => process.exit(1));
      } else {
        process.exit(1);
      }
    });
    
    // Handle SIGTERM for graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received. Shutting down gracefully');
      if (server) {
        server.close(() => {
          console.log('Process terminated');
        });
      }
    });
    
    return server;
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server if this file is run directly
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

// Create app instance
const app = createApp();
let server: Server | null = null;

// Handle process termination
const shutdown = async (signal: string) => {
  console.log(`${signal} received: shutting down server...`);
  
  if (server) {
    server.close((err) => {
      if (err) {
        console.error('Error during server shutdown:', err);
        process.exit(1);
      }
      console.log('Server has been shut down');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

// Setup signal handlers
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Initialize and start the server
const start = async () => {
  try {
    // Initialize Azure services
    await initializeAzureServices();
    
    // Start the server
    server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
    
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: unknown) => {
      console.error('Unhandled Rejection at:', reason);
      if (server) {
        server.close(() => process.exit(1));
      } else {
        process.exit(1);
      }
    });
    
    return server;
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server if this file is run directly
if (isMainModule) {
  start().catch(console.error);
}

// Export the app and start function
export { createApp, start };

export default {
  createApp,
  start,
};
