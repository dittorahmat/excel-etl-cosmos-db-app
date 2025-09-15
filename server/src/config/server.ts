import { Server } from 'http';
import { logger } from '../utils/logger.js';
import { getPort } from '../utils/port-utils.js';
import { initializeAzureServices } from './azure-services.js';
import { createApp } from './app.js';
import type { Express } from 'express';
import { enhancedCosmosDBService } from '../services/cosmos-db/enhanced-cosmos-db.service.js';

let server: Server | null = null;
let app: Express | null = null;

export async function startServer(port: number | string = getPort()): Promise<Server> {
  try {
    logger.info('Initializing Azure services...');
    const azureServices = await initializeAzureServices();
    
    // Initialize the enhanced Cosmos DB service
    logger.info('Initializing enhanced Cosmos DB service...');
    await enhancedCosmosDBService.init();
    
    logger.info('Creating Express application...');
    app = createApp(azureServices);
    
    if (!app) {
      const error = new Error('Failed to initialize Express application');
      logger.error(error.message);
      throw error;
    }

    return new Promise<Server>((resolve, reject) => {
      const httpServer = app!.listen(port, () => {
        server = httpServer;
        logger.info(`Server running on port ${port}`);
        resolve(httpServer);
      });
      
      httpServer.on('error', (error: NodeJS.ErrnoException) => {
        logger.error('Server error:', error);
        reject(error);
      });
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    throw error;
  }
}

export async function stopServer(): Promise<void> {
  if (!server) return Promise.resolve();
  
  return new Promise((resolve, reject) => {
    server!.close((err) => {
      if (err) {
        logger.error('Error stopping server:', err);
        return reject(err);
      }
      logger.info('Server stopped');
      server = null;
      resolve();
    });
  });
}

export function setupGracefulShutdown() {
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Shutting down...`);
    try {
      await stopServer();
      process.exit(0);
    } catch (error) {
      logger.error('Shutdown error:', error);
      process.exit(1);
    }
  };
  
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception:', error);
    stopServer().finally(() => process.exit(1));
  });
  
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection:', reason);
  });
}

export function getApp() {
  return app;
}
