// Minimal test setup for Vitest in Node.js environment
import { config } from 'dotenv';

// Load environment variables from .env file
config({ path: '../../.env' });

// Set test environment variables
process.env.NODE_ENV = 'test';

// Simple console.log to verify setup is loaded
console.log('Minimal test setup loaded');
