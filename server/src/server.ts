#!/usr/bin/env node

import { startServer } from './config/server.js';
import { logger } from './utils/logger.js';

/**
 * Main entry point for the application
 */
async function main() {
  try {
    // Check for command line arguments
    const args = process.argv.slice(2);
    let port: number | string | undefined;
    let isProduction = false;
    
    // Parse command line arguments
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--port' && args[i + 1]) {
        port = args[i + 1];
        i++; // Skip next argument
      } else if (args[i] === '--prod' || args[i] === '--production') {
        isProduction = true;
      }
    }
    
    // Set environment variables if provided via command line
    if (port) {
      process.env.PORT = port.toString();
    }
    if (isProduction) {
      process.env.NODE_ENV = 'production';
    }
    
    // Log the effective configuration
    console.log(`[Server Startup] Starting server with:`);
    console.log(`  - Port: ${process.env.PORT || 'default'}`);
    console.log(`  - Mode: ${process.env.NODE_ENV || 'default'}`);
    
    // Start the server
    const server = await startServer(port);
    const address = server.address();
    
    if (address && typeof address === 'object') {
      logger.info(`Server listening on port ${address.port}`);
    } else {
      logger.info(`Server started: ${address}`);
    }
    
    // Handle process termination
    const shutdown = async () => {
      logger.info('Shutting down server...');
      await new Promise((resolve) => server.close(resolve));
      logger.info('Server has been shut down');
      process.exit(0);
    };
    
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the application
main().catch((error) => {
  logger.error('Unhandled error in main:', error);
  process.exit(1);
});
// Trigger backend workflow deployment
