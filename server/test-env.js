// Simple test script to verify environment variable loading
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('Current working directory:', process.cwd());
console.log('__dirname:', __dirname);

// Try to load .env from server directory
const envPath = resolve(__dirname, '.env');
console.log('Attempting to load .env from:', envPath);

if (fs.existsSync(envPath)) {
  console.log('.env file exists, loading...');
  const result = dotenv.config({ path: envPath });
  
  if (result.error) {
    console.error('Error loading .env file:', result.error);
  } else {
    console.log('Successfully loaded .env file');
    console.log('Loaded variables:', Object.keys(result.parsed || {}));
    
    // Check for specific variables
    const checkVars = [
      'AZURE_COSMOSDB_ENDPOINT',
      'AZURE_COSMOSDB_KEY',
      'AZURE_COSMOSDB_CONNECTION_STRING',
      'AZURE_STORAGE_CONNECTION_STRING'
    ];
    
    checkVars.forEach(varName => {
      const value = process.env[varName];
      console.log(`${varName}:`, value ? (varName.includes('KEY') || varName.includes('CONNECTION') ? '***' : value) : 'Not set');
    });
  }
} else {
  console.error('Error: .env file not found at', envPath);
}
