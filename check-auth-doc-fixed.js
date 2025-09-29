const { CosmosClient } = require('@azure/cosmos');

async function checkAuthorizationDocument() {
  console.log('Checking for authorization document in Cosmos DB...');
  
  // Get environment variables
  const endpoint = process.env.AZURE_COSMOSDB_ENDPOINT;
  const key = process.env.AZURE_COSMOSDB_KEY;
  const databaseName = process.env.AZURE_COSMOSDB_DATABASE || 'excel-data';
  const containerName = process.env.AZURE_COSMOSDB_CONTAINER || 'records';
  
  if (!endpoint || !key) {
    console.error('Missing required environment variables:');
    console.error('- AZURE_COSMOSDB_ENDPOINT:', endpoint ? 'Set' : 'Not set');
    console.error('- AZURE_COSMOSDB_KEY:', key ? 'Set' : 'Not set');
    process.exit(1);
  }
  
  try {
    console.log(`Connecting to Cosmos DB at ${endpoint}`);
    const client = new CosmosClient({ endpoint, key });
    
    // Get database and container
    const database = client.database(databaseName);
    const container = database.container(containerName);
    
    // Query for the authorization configuration document
    console.log('Querying for authorization configuration document...');
    const querySpec = {
      query: \"SELECT * FROM c WHERE c.id = @id AND c.type = @type\",
      parameters: [
        { name: \"@id\", value: \"authorized-upload-users\" },
        { name: \"@type\", value: \"authorization-config\" }
      ]
    };
    
    const { resources } = await container.items.query(querySpec).fetchAll();
    
    if (resources.length > 0) {
      console.log('Found authorization configuration document:');
      console.log(JSON.stringify(resources[0], null, 2));
      
      // Check if the document has the authorizedUploadUsers field
      if (Array.isArray(resources[0].authorizedUploadUsers)) {
        console.log('\\nAuthorized upload users:');
        resources[0].authorizedUploadUsers.forEach(email => {
          console.log(`- ${email}`);
        });
      } else {
        console.log('\\nNo authorizedUploadUsers array found in document');
        console.log('Document structure:', Object.keys(resources[0]));
      }
    } else {
      console.log('No authorization configuration document found');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error querying Cosmos DB:', error);
    process.exit(1);
  }
}

checkAuthorizationDocument();