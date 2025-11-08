import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { CosmosClient } from '@azure/cosmos';

// Log environment variables for debugging
console.log('Environment Variables:');
console.log(`- AZURE_COSMOS_ENDPOINT: ${process.env.AZURE_COSMOS_ENDPOINT ? 'Set' : 'Not set'}`);
console.log(`- AZURE_COSMOS_KEY: ${process.env.AZURE_COSMOS_KEY ? 'Set' : 'Not set'}`);
console.log(`- AZURE_COSMOS_DATABASE: ${process.env.AZURE_COSMOS_DATABASE || 'Not set'}`);
console.log(`- AZURE_COSMOS_CONTAINER: ${process.env.AZURE_COSMOS_CONTAINER || 'Not set'}`);

// Import the function after setting up environment variables
import { testCosmosConnection } from '../services/cosmos-db/cosmos-db.service.js';

// Get the current module's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try to load environment variables from multiple possible locations
const envPaths = [
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../../../.env'),
  path.resolve(process.cwd(), '.env')
];

let envLoaded = false;
for (const envPath of envPaths) {
  try {
    dotenv.config({ path: envPath });
    console.log(`Loaded .env from: ${envPath}`);
    envLoaded = true;
    break;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.log(`Failed to load .env from ${envPath}:`, errorMessage);
  }
}

if (!envLoaded) {
  console.warn('Warning: No .env file loaded, using process.env');
}

async function runTest() {
  console.log('\n=== Starting Cosmos DB Connection Test ===');
  
  try {
    console.log('\n[1/3] Testing direct Cosmos DB connection...');
    const client = new CosmosClient({
      endpoint: process.env.AZURE_COSMOS_ENDPOINT || '',
      key: process.env.AZURE_COSMOS_KEY || ''
    });
    
    try {
      // Use iterator instead of fetchAll to avoid loading all results into memory
      const queryIterator = client.databases.readAll();
      const result = await queryIterator.fetchNext();
      const databases = result.resources || [];
      
      console.log(`✅ Successfully connected to Cosmos DB. Found ${databases.length} databases.`);
      console.log('Available databases:', databases.map((db: { id: string }) => db.id).join(', '));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to connect to Cosmos DB:', errorMessage);
      console.error('Please verify your Cosmos DB endpoint and key in the .env file');
      throw error;
    }
    
    console.log('\n[2/3] Testing Cosmos DB service...');
    const result = await testCosmosConnection();
    
    console.log('\n=== Test Results ===');
    console.log(`Success: ${result.success}`);
    console.log(`Message: ${result.message}`);
    
    console.log('\n=== Connection Details ===');
    console.log(`Database: ${result.database || 'N/A'}`);
    console.log(`Container: ${result.container || 'N/A'}`);
    
    if ('error' in result) {
      console.log('\n=== Error ===');
      console.log(`Error: ${result.error}`);
      if (result.endpoint) {
        console.log(`Endpoint: ${result.endpoint}`);
      }
    }
    
    if (!result.success) {
      process.exit(1);
    }
    
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('\n=== Test Failed ===');
    console.error('An unexpected error occurred:');
    console.error(error);
    process.exit(1);
  }
}

// Run the test
runTest();
