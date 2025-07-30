import { CosmosClient } from '@azure/cosmos';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the server's .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Log environment variables for debugging
console.log('Environment variables loaded from:', path.resolve(__dirname, '../.env'));
console.log('COSMOS_ENDPOINT:', process.env.COSMOS_ENDPOINT ? '***' : 'Not set');
console.log('COSMOS_DATABASE:', process.env.COSMOS_DATABASE || 'Not set');
console.log('COSMOS_CONTAINER:', process.env.COSMOS_CONTAINER || 'Not set');

export async function testCosmosConnection() {
  const endpoint = process.env.COSMOS_ENDPOINT;
  const key = process.env.COSMOS_KEY;
  const databaseId = process.env.COSMOS_DATABASE || 'excel-import-db';
  const containerId = process.env.COSMOS_CONTAINER || 'imports';

  if (!endpoint || !key) {
    console.error('Missing required environment variables: COSMOS_ENDPOINT and/or COSMOS_KEY');
    process.exit(1);
  }

  try {
    console.log('Creating Cosmos DB client...');
    const client = new CosmosClient({ endpoint, key });
    
    console.log('Connecting to database...');
    const { database } = await client.databases.createIfNotExists({ id: databaseId });
    console.log(`Connected to database: ${database.id}`);
    
    console.log('Connecting to container...');
    const { container } = await database.containers.createIfNotExists({ id: containerId });
    console.log(`Connected to container: ${container.id}`);
    
    // Test query
    console.log('Running test query...');
    const querySpec = {
      query: 'SELECT VALUE COUNT(1) FROM c'
    };
    
    const { resources: items } = await container.items.query(querySpec).fetchAll();
    console.log(`Container contains ${items[0]} documents`);
    
    console.log('✅ Cosmos DB connection test completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error testing Cosmos DB connection:');
    console.error(error);
    return false;
  }
}

// Run the test if this file is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  testCosmosConnection()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
}
