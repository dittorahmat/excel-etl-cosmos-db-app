#!/usr/bin/env node

import { startServer } from './server/dist/server/src/config/server.js';
import { logger } from './server/dist/server/src/utils/logger.js';
// Load unified configuration
import { config } from './config/index.js';

async function main() {
  try {
    // Load environment variables through unified config
    const { server: serverConfig, shared } = config;
    
    const port = process.env.PORT || serverConfig.server.port || 3000;
    const isProduction = process.env.NODE_ENV === 'production' || shared.env.isProduction;
    
    console.log('[Test] Starting server with:');
    console.log('  - Port:', port);
    console.log('  - Mode:', process.env.NODE_ENV || 'default');
    console.log('  - Is Production:', isProduction);
    
    // Start the server
    const server = await startServer(port);
    const address = server.address();
    
    if (address && typeof address === 'object') {
      logger.info(`Server listening on port ${address.port}`);
    } else {
      logger.info(`Server started: ${address}`);
    }
    
    // Keep the process alive
    process.on('SIGTERM', () => process.exit(0));
    process.on('SIGINT', () => process.exit(0));
    
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