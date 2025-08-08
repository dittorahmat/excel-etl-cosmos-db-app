import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { CosmosClient, Container } from '@azure/cosmos';
import { v4 as uuidv4 } from 'uuid';

// Get the current module's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Log environment variables for debugging
console.log('=== Environment Variables ===');
console.log(`- AZURE_COSMOS_ENDPOINT: ${process.env.AZURE_COSMOS_ENDPOINT ? 'Set' : 'Not set'}`);
console.log(`- AZURE_COSMOS_KEY: ${process.env.AZURE_COSMOS_KEY ? 'Set' : 'Not set'}`);
console.log(`- AZURE_COSMOS_DATABASE: ${process.env.AZURE_COSMOS_DATABASE || 'Not set'}`);
console.log(`- AZURE_COSMOS_CONTAINER: ${process.env.AZURE_COSMOS_CONTAINER || 'Not set'}`);
console.log(`- AZURE_COSMOS_PARTITION_KEY: ${process.env.AZURE_COSMOS_PARTITION_KEY || '/id'}`);

// Configuration
const DATABASE_ID = process.env.AZURE_COSMOS_DATABASE || 'excel-upload-db';
const CONTAINER_ID = process.env.AZURE_COSMOS_CONTAINER || 'excel-records';
const PARTITION_KEY = process.env.AZURE_COSMOS_PARTITION_KEY || '/id';

// Test record
const TEST_RECORD = {
  id: uuidv4(),
  fileName: 'test-file.xlsx',
  uploadDate: new Date().toISOString(),
  status: 'test',
  documentType: 'testRecord',
  _partitionKey: 'test-partition',
  testField: 'This is a test record',
};

async function testCosmosWrite() {
  console.log('\n=== Starting Cosmos DB Write Test ===');
  
  // 1. Initialize Cosmos DB client
  console.log('\n[1/4] Initializing Cosmos DB client...');
  const client = new CosmosClient({
    endpoint: process.env.AZURE_COSMOS_ENDPOINT || '',
    key: process.env.AZURE_COSMOS_KEY || ''
  });

  try {
    // 2. Test database connection
    console.log('\n[2/4] Testing database connection...');
    const { database } = await client.databases.createIfNotExists({ id: DATABASE_ID });
    console.log(`✅ Connected to database: ${database.id}`);

    // 3. Test container operations
    console.log('\n[3/4] Testing container operations...');
    let container: Container;
    
    try {
      const { container: existingContainer } = await database.containers.createIfNotExists({
        id: CONTAINER_ID,
        partitionKey: { paths: [PARTITION_KEY] }
      });
      container = existingContainer;
      console.log(`✅ Container ${container.id} is ready`);
      // Note: partitionKey is not directly accessible from the container instance
      console.log(`   Using partition key path: ${PARTITION_KEY}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorCode = error && typeof error === 'object' && 'code' in error ? String(error.code) : 'UNKNOWN';
      
      console.error('❌ Failed to access container:', errorMessage);
      if (errorCode === '403') {
        console.error('  - Check if the Cosmos DB key has write permissions');
        console.error('  - Verify the key is not read-only');
      } else if (errorCode === '400') {
        console.error('  - Check if the container name is valid');
        console.error('  - Verify the partition key matches the container definition');
      }
      throw error;
    }

    // 4. Test write operation
    console.log('\n[4/4] Testing write operation...');
    try {
      console.log('  Writing test record:', {
        id: TEST_RECORD.id,
        partitionKey: TEST_RECORD._partitionKey
      });
      
      const { resource: createdItem } = await container.items.upsert(TEST_RECORD);
      
      if (createdItem) {
        console.log('✅ Successfully wrote test record to Cosmos DB');
        console.log('   Document ID:', createdItem.id);
        console.log('   ETag:', createdItem._etag);
        
        // Clean up: Delete the test record
        try {
          await container.item(createdItem.id, createdItem._partitionKey || '').delete();
          console.log('✅ Successfully cleaned up test record');
        } catch (cleanupError) {
          console.warn('⚠️  Could not clean up test record:', (cleanupError as Error).message);
        }
      } else {
        console.error('❌ Failed to write test record: No resource returned');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorCode = error && typeof error === 'object' && 'code' in error ? String(error.code) : 'UNKNOWN';
      
      console.error('❌ Failed to write test record:', errorMessage);
      if (errorCode === '400') {
        console.error('  - Check if the partition key value is valid');
        console.error('  - Verify the document structure matches the container schema');
      } else if (errorCode === '403') {
        console.error('  - Check if the Cosmos DB key has write permissions');
      } else if (errorCode === '409') {
        console.error('  - A document with the same ID already exists');
      }
      throw error;
    }
    
    console.log('\n=== Test completed successfully! ===');
    return { success: true };
  } catch (error) {
    console.error('\n=== Test Failed ===');
    console.error('An error occurred during testing:');
    console.error(error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Run the test
testCosmosWrite()
  .then(({ success }) => process.exit(success ? 0 : 1))
  .catch(() => process.exit(1));
