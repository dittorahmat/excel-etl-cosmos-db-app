import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get the current module's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from the server's .env file
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

// Log environment variables for debugging
console.log('Environment variables loaded from:', envPath);
console.log('AZURE_COSMOS_ENDPOINT:', process.env.AZURE_COSMOS_ENDPOINT ? '***' : 'Not set');
console.log('AZURE_COSMOS_KEY:', process.env.AZURE_COSMOS_KEY ? '***' : 'Not set');
console.log('AZURE_COSMOS_DATABASE:', process.env.AZURE_COSMOS_DATABASE || 'Not set');
console.log('AZURE_COSMOS_CONTAINER:', process.env.AZURE_COSMOS_CONTAINER || 'Not set');

async function runTest() {
  console.log('Starting Cosmos DB connection test...');
  
  try {
    // Import the Cosmos DB service module
    const modulePath = path.resolve(__dirname, '../src/services/cosmos-db/cosmos-db.service.js');
    console.log(`Importing from: ${modulePath}`);
    
    // Dynamic import with error handling
    const module = await import(modulePath);
    const { testConnection: testCosmosConnection } = module;
    
    if (typeof testCosmosConnection !== 'function') {
      throw new Error('testCosmosConnection is not a function. Exported members: ' + Object.keys(module).join(', '));
    }
    
    console.log('Calling testCosmosConnection...');
    const result = await testCosmosConnection();
    
    console.log('\n=== Test Results ===');
    console.log(`Success: ${result.success ?? 'Not specified'}`);
    console.log(`Message: ${result.message || 'No message provided'}`);
    
    console.log('\n=== Connection Details ===');
    console.log(`Database: ${result.database || 'Not specified'}`);
    console.log(`Container: ${result.container || 'Not specified'}`);
    
    if (result.error) {
      console.log('\n=== Error ===');
      console.log(result.error);
    }
    
    // Additional debug information
    console.log('\n=== Debug Information ===');
    console.log('Environment Variables:');
    console.log(`- AZURE_COSMOS_ENDPOINT: ${process.env.AZURE_COSMOS_ENDPOINT ? 'Set' : 'Not set'}`);
    console.log(`- AZURE_COSMOS_KEY: ${process.env.AZURE_COSMOS_KEY ? 'Set' : 'Not set'}`);
    console.log(`- AZURE_COSMOS_DATABASE: ${process.env.AZURE_COSMOS_DATABASE || 'Not set'}`);
    console.log(`- AZURE_COSMOS_CONTAINER: ${process.env.AZURE_COSMOS_CONTAINER || 'Not set'}`);
    
    // Check if the test was successful
    if (result.success === false) {
      console.log('\n❌ Test failed');
      process.exit(1);
    } else if (result.success === true) {
      console.log('\n✅ Test completed successfully!');
    } else {
      console.log('\n⚠️  Test completed with unknown status');
    }
  } catch (error) {
    console.error('\n=== Test Failed ===');
    console.error('An unexpected error occurred:');
    console.error(error);
    process.exit(1);
  }
}

// Run the test
runTest();
