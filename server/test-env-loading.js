// Test script to verify environment variable loading
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Testing environment variable loading...');
console.log('Current working directory:', process.cwd());

// Try to load .env from different locations
const envPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'server/.env'),
  path.resolve(process.cwd(), '../.env'),
  path.resolve(__dirname, '.env'),
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '../../.env'),
];

let loaded = false;
for (const envPath of envPaths) {
  try {
    console.log(`\nTrying to load .env from: ${envPath}`);
    const result = dotenv.config({ path: envPath });
    
    if (result.error) {
      console.log(`❌ Error loading .env from ${envPath}:`, result.error.message);
      continue;
    }
    
    console.log(`✅ Successfully loaded .env from: ${envPath}`);
    console.log('Loaded environment variables:', Object.keys(result.parsed || {}).join(', '));
    
    // Log specific variables we care about
    const varsToCheck = [
      'AZURE_COSMOSDB_ENDPOINT',
      'AZURE_COSMOSDB_KEY',
      'AZURE_STORAGE_CONNECTION_STRING',
      'AZURE_STORAGE_CONTAINER'
    ];
    
    console.log('\nEnvironment variables:');
    for (const varName of varsToCheck) {
      console.log(`${varName}: ${process.env[varName] ? '***' : 'Not set'}`);
    }
    
    loaded = true;
    break;
  } catch (error) {
    console.log(`❌ Error loading .env from ${envPath}:`, error.message);
  }
}

if (!loaded) {
  console.log('\n❌ Failed to load .env from any location');
  console.log('Current environment variables:', Object.keys(process.env).join(', '));
} else {
  console.log('\n✅ Environment variable test completed successfully');
}
