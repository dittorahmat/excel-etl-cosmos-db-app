import { CosmosClient, type ContainerDefinition } from '@azure/cosmos';
import { AZURE_CONFIG } from '../server/src/config/azure-config.js';

async function updateIndexingPolicy() {
  console.log('Starting Cosmos DB indexing policy migration...');

  const client = new CosmosClient({
    endpoint: AZURE_CONFIG.cosmos.endpoint,
    key: AZURE_CONFIG.cosmos.key
  });

  const database = client.database(AZURE_CONFIG.cosmos.databaseName);

  // Get the existing excel-records container
  const container = database.container(AZURE_CONFIG.cosmos.containerName);

  try {
    console.log(`Reading current configuration for container: ${AZURE_CONFIG.cosmos.containerName}`);
    
    // Read the current container definition
    const containerResponse = await container.read();
    const containerDefinition: ContainerDefinition = containerResponse.resource;

    console.log('Current indexing policy:', containerDefinition.indexingPolicy);

    // Update the indexing policy with our optimized configuration
    containerDefinition.indexingPolicy = {
      includedPaths: [
        {
          path: "/*" // Include all paths by default
        },
        // Add specific paths for the special filter fields to optimize queries
        { path: "/Source/?" },
        { path: "/Category/?" },
        { path: "/\"Sub Category\"/?" },
        { path: "/Year/?" }
      ],
      excludedPaths: [
        { path: "/\"_etag\"/?" } // Exclude system properties that are not needed for queries
      ],
      indexingMode: "consistent", // Consistent indexing for real-time query results
      automatic: true // Automatically index all properties
    };

    console.log('Updating container with new indexing policy...');
    
    // Replace the container with the updated definition
    const replaceResponse = await container.replace(containerDefinition);
    
    console.log('Indexing policy updated successfully:', {
      container: replaceResponse.resource.id,
      indexingMode: replaceResponse.resource.indexingPolicy?.indexingMode,
      indexingPolicy: replaceResponse.resource.indexingPolicy
    });

    console.log('Migration completed successfully!');
    console.log('The new indexes will be built in the background.');
    console.log('Queries on Source, Category, Sub Category, and Year fields will be optimized once indexing is complete.');
  } catch (error) {
    console.error('Error updating indexing policy:', error);
    throw error;
  } finally {
    // Close the client connection
    await client.dispose();
    console.log('Client connection disposed.');
  }
}

// Run the migration if this file is executed directly
if (process.argv[1].endsWith('migrate-cosmos-indexes.ts')) {
  console.log('Running Cosmos DB indexing policy migration script...');
  updateIndexingPolicy()
    .then(() => {
      console.log('Migration script completed successfully.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

export { updateIndexingPolicy };