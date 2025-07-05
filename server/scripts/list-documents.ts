import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { CosmosClient } from '@azure/cosmos';

// Get the current module's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the server's .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Map AZURE_* variables to non-prefixed versions for backward compatibility
if (!process.env.COSMOS_ENDPOINT && process.env.AZURE_COSMOSDB_ENDPOINT) {
  process.env.COSMOS_ENDPOINT = process.env.AZURE_COSMOSDB_ENDPOINT;
}
if (!process.env.COSMOS_KEY && process.env.AZURE_COSMOSDB_KEY) {
  process.env.COSMOS_KEY = process.env.AZURE_COSMOSDB_KEY;
}
if (!process.env.COSMOS_DATABASE && process.env.AZURE_COSMOSDB_DATABASE) {
  process.env.COSMOS_DATABASE = process.env.AZURE_COSMOSDB_DATABASE;
}
if (!process.env.COSMOS_CONTAINER && process.env.AZURE_COSMOSDB_CONTAINER) {
  process.env.COSMOS_CONTAINER = process.env.AZURE_COSMOSDB_CONTAINER;
}

async function listDocuments() {
  console.log('Connecting to Cosmos DB...');
  console.log(`Endpoint: ${process.env.COSMOS_ENDPOINT}`);
  console.log(`Database: ${process.env.COSMOS_DATABASE}`);
  console.log(`Container: ${process.env.COSMOS_CONTAINER}`);

  const client = new CosmosClient({
    endpoint: process.env.COSMOS_ENDPOINT!,
    key: process.env.COSMOS_KEY!,
  });

  const database = client.database(process.env.COSMOS_DATABASE!);
  const container = database.container(process.env.COSMOS_CONTAINER!);

  try {
    console.log('\n=== Listing first 10 documents ===');
    const { resources: items } = await container.items.query('SELECT * FROM c OFFSET 0 LIMIT 10').fetchAll();
    
    console.log(`Found ${items.length} documents:`);
    console.log(JSON.stringify(items, null, 2));
    
    // Check for import_* documents specifically
    console.log('\n=== Checking for import_* documents ===');
    const { resources: importDocs } = await container.items
      .query({
        query: 'SELECT * FROM c WHERE STARTSWITH(c.id, @prefix) OFFSET 0 LIMIT 10',
        parameters: [{ name: '@prefix', value: 'import_' }]
      })
      .fetchAll();
      
    console.log(`Found ${importDocs.length} import documents:`);
    console.log(JSON.stringify(importDocs, null, 2));
    
  } catch (error) {
    console.error('Error querying Cosmos DB:', error);
  }
}

listDocuments().catch(console.error);
