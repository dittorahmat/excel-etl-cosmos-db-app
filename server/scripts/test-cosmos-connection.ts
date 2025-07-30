import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get the current module's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from the server's .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Log environment variables for debugging
console.log('Environment variables loaded from:', path.resolve(__dirname, '../.env'));
console.log('COSMOS_ENDPOINT:', process.env.COSMOS_ENDPOINT ? '***' : 'Not set');
console.log('COSMOS_DATABASE:', process.env.COSMOS_DATABASE || 'Not set');
console.log('COSMOS_CONTAINER:', process.env.COSMOS_CONTAINER || 'Not set');

async function runTest() {
  console.log('Starting Cosmos DB connection test...');
  
  try {
    // Import from the built JavaScript file
    // Note: The build output is in dist/server/server/src/services/cosmos-db/cosmos-db.service.js
    const modulePath = path.resolve(__dirname, '../server/src/services/cosmos-db/cosmos-db.service.js');
    console.log(`Importing from: ${modulePath}`);
    
    // Dynamic import with error handling
    const module = await import(modulePath);
    const { testCosmosConnection } = module;
    
    if (typeof testCosmosConnection !== 'function') {
      throw new Error('testCosmosConnection is not a function. Exported members: ' + Object.keys(module).join(', '));
    }
    
    console.log('Calling testCosmosConnection...');
    const result = await testCosmosConnection();
    
    console.log('\n=== Test Results ===');
    console.log(`Success: ${result.success}`);
    console.log(`Message: ${result.message}`);
    
    console.log('\n=== Connection Details ===');
    console.log(`Database: ${result.database || 'Not specified'}`);
    console.log(`Container: ${result.container || 'Not specified'}`);
    
    if (result.error) {
      console.log('\n=== Error ===');
      console.log(result.error);
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
