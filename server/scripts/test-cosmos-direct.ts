import { CosmosClient } from '@azure/cosmos';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try to load environment variables from multiple locations
const envPaths = [
  path.resolve(__dirname, '../../.env'),      // Project root
  path.resolve(__dirname, '../.env'),         // Server directory
  path.resolve(process.cwd(), '.env')          // Current working directory
];

let loadedEnvPath = '';
for (const envPath of envPaths) {
  const result = dotenv.config({ path: envPath });
  if (!result.error) {
    loadedEnvPath = envPath;
    break;
  }
}

// Log environment variables for debugging
console.log('Environment variables loaded from:', loadedEnvPath || 'No .env file found');
console.log('AZURE_COSMOS_ENDPOINT:', process.env.AZURE_COSMOS_ENDPOINT ? '***' : 'Not set');
console.log('AZURE_COSMOS_KEY:', process.env.AZURE_COSMOS_KEY ? '***' : 'Not set');
console.log('AZURE_COSMOS_DATABASE:', process.env.AZURE_COSMOS_DATABASE || 'Not set');
console.log('AZURE_COSMOS_CONTAINER:', process.env.AZURE_COSMOS_CONTAINER || 'Not set');

// Also check for non-prefixed versions of the variables for backward compatibility
if (!process.env.AZURE_COSMOS_ENDPOINT && process.env.COSMOS_ENDPOINT) {
  process.env.AZURE_COSMOS_ENDPOINT = process.env.COSMOS_ENDPOINT;
  console.log('Using COSMOS_ENDPOINT from environment');
}

if (!process.env.AZURE_COSMOS_KEY && process.env.COSMOS_KEY) {
  process.env.AZURE_COSMOS_KEY = process.env.COSMOS_KEY;
  console.log('Using COSMOS_KEY from environment');
}

if (!process.env.AZURE_COSMOS_DATABASE && process.env.COSMOS_DATABASE) {
  process.env.AZURE_COSMOS_DATABASE = process.env.COSMOS_DATABASE;
  console.log('Using COSMOS_DATABASE from environment');
}

if (!process.env.AZURE_COSMOS_CONTAINER && process.env.COSMOS_CONTAINER) {
  process.env.AZURE_COSMOS_CONTAINER = process.env.COSMOS_CONTAINER;
  console.log('Using COSMOS_CONTAINER from environment');
}

export async function testCosmosConnection() {
  const endpoint = process.env.AZURE_COSMOS_ENDPOINT;
  const key = process.env.AZURE_COSMOS_KEY;
  const databaseId = process.env.AZURE_COSMOS_DATABASE || 'excel-import-db';
  const containerId = process.env.AZURE_COSMOS_CONTAINER || 'imports';

  if (!endpoint || !key) {
    console.error('Missing required environment variables:');
    console.error('- AZURE_COSMOS_ENDPOINT:', endpoint ? '***' : 'Not set');
    console.error('- AZURE_COSMOS_KEY:', key ? '***' : 'Not set');
    console.error('\nPlease make sure these variables are set in your .env file.');
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
