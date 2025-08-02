#!/usr/bin/env node

// This is the production entry point for the application
// It's used to start the server with the correct environment variables

// Set default NODE_ENV to production if not set
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

// Load environment variables from .env file
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, 'server', '.env') });

// Import the server from the built files
import('./dist/server/src/server.js')
  .then(({ startServer }) => {
    // Start the server
    return startServer();
  })
  .catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
