#!/usr/bin/env node

import { startServer } from './config/server.js';
import { logger } from './utils/logger.js';

/**
 * Main entry point for the application
 */
async function main() {
  try {
    // Start the server
    const server = await startServer();
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
