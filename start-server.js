#!/usr/bin/env node

// This is the production entry point for the application
// It's used to start the server with the correct environment variables

// Set default NODE_ENV to production if not set
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

// Load environment variables from .env file
require('dotenv').config({ path: './server/.env' });

// Import the server from the built files
const { startServer } = require('./dist/server/server/src/server');

// Start the server
startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
