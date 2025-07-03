import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get the current module's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from the server's .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function runTest() {
  console.log('Starting Cosmos DB connection test...');
  
  try {
    // Use dynamic import to avoid TypeScript module resolution issues
    const { testCosmosConnection } = await import('../src/services/cosmos-db/cosmos-db.service.js');
    
    const result = await testCosmosConnection();
    
    console.log('\n=== Test Results ===');
    console.log(`Success: ${result.success}`);
    console.log(`Message: ${result.message}`);
    
    console.log('\n=== Connection Details ===');
    console.log(`Database: ${result.database}`);
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
