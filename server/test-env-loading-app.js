// Test script to verify environment variable loading in the app context
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Testing environment variable loading in app context...');
console.log('Current working directory:', process.cwd());
console.log('__dirname:', __dirname);

// 1. First, log the initial process.env
console.log('\n=== Initial process.env ===');
logEnvVars();

// 2. Try to load .env from the same location as the test script
const envPath = path.resolve(__dirname, '.env');
console.log(`\n=== Loading .env from: ${envPath} ===`);
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('❌ Error loading .env file:', result.error);
} else {
  console.log('✅ Successfully loaded .env file');
  console.log('Loaded environment variables:', Object.keys(result.parsed || {}).join(', '));
}

// 3. Log process.env after loading .env
console.log('\n=== process.env after loading .env ===');
logEnvVars();

// 4. Import the env module to see what it exports
console.log('\n=== Importing env module ===');
import { env } from './dist/config/env.js';
console.log('env module loaded');
console.log('env.AZURE_COSMOSDB_ENDPOINT:', env.AZURE_COSMOSDB_ENDPOINT ? '***' : 'Not set');
console.log('env.AZURE_COSMOSDB_KEY:', env.AZURE_COSMOSDB_KEY ? '***' : 'Not set');

// 5. Import the azure-config module to see what it exports
console.log('\n=== Importing azure-config module ===');
import { AZURE_CONFIG } from './dist/config/azure-config.js';
console.log('azure-config module loaded');
console.log('AZURE_CONFIG.cosmos.endpoint:', AZURE_CONFIG.cosmos.endpoint ? '***' : 'Not set');
console.log('AZURE_CONFIG.cosmos.key:', AZURE_CONFIG.cosmos.key ? '***' : 'Not set');

// Helper function to log environment variables
function logEnvVars() {
  const varsToLog = [
    'NODE_ENV',
    'AZURE_COSMOSDB_ENDPOINT',
    'AZURE_COSMOSDB_KEY',
    'AZURE_STORAGE_CONNECTION_STRING',
    'AZURE_STORAGE_CONTAINER'
  ];

  console.log('Environment variables:');
  for (const varName of varsToLog) {
    console.log(`  ${varName}: ${process.env[varName] ? '***' : 'Not set'}`);
  }
}

console.log('\n=== Test complete ===');
