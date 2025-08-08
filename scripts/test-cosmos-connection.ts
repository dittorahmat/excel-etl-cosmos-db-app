import { initializeCosmosDB } from '../server/src/services/cosmos-db/cosmos-db.service.js';
import { logger } from '../server/src/utils/logger.js';

async function testConnection() {
  try {
    logger.info('Testing Cosmos DB connection...');
    
    // Initialize the Cosmos DB client
    const cosmosDb = await initializeCosmosDB();
    
    // Test connection by listing databases
    const { resources: databases } = await cosmosDb.cosmosClient.databases.readAll().fetchAll();
    logger.info('Successfully connected to Cosmos DB');
    logger.info(`Available databases: ${databases.map(db => db.id).join(', ')}`);
    
    // Test container access
    const containerName = 'excel-records';
    const databaseName = 'excel-upload-db';
    
    try {
      logger.info(`Accessing database: ${databaseName}`);
      const database = cosmosDb.cosmosClient.database(databaseName);
      
      // List all containers in the database
      const { resources: containers } = await database.containers.readAll().fetchAll();
      logger.info(`Available containers in ${databaseName}:`, containers.map(c => c.id));
      
      if (!containers.some(c => c.id === containerName)) {
        throw new Error(`Container '${containerName}' not found in database '${databaseName}'`);
      }
      
      logger.info(`Accessing container: ${containerName}`);
      const container = database.container(containerName);
      
      // Read container properties and partition key definition
      const { resource: containerProps } = await container.read();
      
      if (!containerProps) {
        throw new Error(`Failed to read container properties for '${containerName}'`);
      }
      
      // Log container details including partition key definition
      const partitionKeyPath = containerProps.partitionKey?.paths?.[0] || '/_partitionKey';
      const partitionKeyPathWithoutSlash = partitionKeyPath.startsWith('/') ? partitionKeyPath.substring(1) : partitionKeyPath;
      
      logger.info('Container details:', {
        containerId: containerProps.id,
        partitionKey: containerProps.partitionKey,
        partitionKeyPath,
        indexingPolicy: containerProps.indexingPolicy,
        _rid: containerProps._rid,
        _ts: containerProps._ts,
        _etag: containerProps._etag,
        _self: containerProps._self
      });
      
      // Define a basic document type with common Cosmos DB fields
      interface CosmosDocument {
        id: string;
        _partitionKey?: string;
        [key: string]: unknown; // Use unknown instead of any for type safety
      }

      // Helper function to extract partition key value from a document
      const getPartitionKeyValue = (doc: CosmosDocument): string => {
        if (partitionKeyPath === '/_partitionKey') {
          return (doc._partitionKey as string) || 'default';
        }
        // Handle nested partition keys if needed
        const keys = partitionKeyPathWithoutSlash.split('.');
        let value: unknown = doc;
        
        for (const key of keys) {
          if (value && typeof value === 'object' && key in value) {
            value = (value as Record<string, unknown>)[key];
          } else {
            return 'default';
          }
        }
        
        return typeof value === 'string' ? value : 'default';
      };
      
      // Try to insert a test document with dynamic partition key
      const testDoc = {
        id: `test-${Date.now()}`,
        _partitionKey: 'test', // Will be used if partition key path is /_partitionKey
        test: 'This is a test document',
        timestamp: new Date().toISOString(),
        documentType: 'test-document'
      };
      
      // Ensure the document has the correct partition key field based on container's definition
      const partitionKeyValue = getPartitionKeyValue(testDoc);
      logger.info('Using partition key value:', { partitionKeyValue, partitionKeyPath });
      
      logger.info('Attempting to insert test document:', {
        id: testDoc.id,
        partitionKey: testDoc._partitionKey,
        documentType: testDoc.documentType
      });
      
      try {
        const { resource: createdDoc, statusCode, headers } = await container.items.upsert(testDoc);
        
        if (!createdDoc) {
          throw new Error('No document was created (createdDoc is null)');
        }
        
        logger.info('Successfully inserted test document:', {
          id: createdDoc.id,
          etag: createdDoc._etag,
          timestamp: createdDoc.timestamp,
          statusCode,
          requestCharge: headers['x-ms-request-charge'],
          activityId: headers['x-ms-activity-id']
        });
        
        // Verify the document exists
        logger.info('Verifying document exists...', {
          documentId: createdDoc.id,
          partitionKey: testDoc._partitionKey,
          etag: createdDoc._etag
        });
        
        // Try to read the document with detailed error handling
        let readDoc;
        try {
          const readResponse = await container.item(createdDoc.id, getPartitionKeyValue(createdDoc)).read();
          readDoc = readResponse.resource;
          
          logger.debug('Document read response:', {
            statusCode: readResponse.statusCode,
            headers: readResponse.headers,
            activityId: readResponse.headers?.['x-ms-activity-id'],
            requestCharge: readResponse.headers?.['x-ms-request-charge']
          });
          
          if (!readDoc) {
            // Try to query for the document if direct read fails
            logger.warn('Direct read returned no document, trying query...');
            const querySpec = {
              query: 'SELECT * FROM c WHERE c.id = @id',
              parameters: [{ name: '@id', value: createdDoc.id }]
            };
            
            const { resources: queryResults } = await container.items.query(querySpec).fetchAll();
            logger.debug(`Query returned ${queryResults.length} documents`);
            
            if (queryResults.length > 0) {
              readDoc = queryResults[0];
              logger.warn('Document found via query but not direct read - possible partition key mismatch', {
                documentId: readDoc.id,
                documentPartitionKey: readDoc._partitionKey,
                expectedPartitionKey: testDoc._partitionKey
              });
            }
          }
        } catch (error) {
          const readError = error as Error & {
            code?: string;
            statusCode?: number;
            headers?: {
              [key: string]: string | undefined;
              'x-ms-activity-id'?: string;
              'x-ms-substatus'?: string;
            };
          };
          
          logger.error('Error reading document:', {
            error: readError.message,
            code: readError.code,
            statusCode: readError.statusCode,
            activityId: readError.headers?.['x-ms-activity-id'],
            substatus: readError.headers?.['x-ms-substatus'],
            stack: readError.stack
          });
          
          // If read fails, try to query for the document anyway
          try {
            const querySpec = {
              query: 'SELECT * FROM c WHERE c.id = @id',
              parameters: [{ name: '@id', value: createdDoc.id }]
            };
            
            const { resources: queryResults } = await container.items.query(querySpec).fetchAll();
            logger.warn(`Query after read error returned ${queryResults.length} documents`);
            
            if (queryResults.length > 0) {
              readDoc = queryResults[0];
              logger.warn('Document found via query after read error', {
                documentId: readDoc.id,
                documentPartitionKey: readDoc._partitionKey,
                expectedPartitionKey: testDoc._partitionKey
              });
            }
          } catch (error) {
            const queryError = error as Error & {
              code?: string;
              statusCode?: number;
              headers?: {
                [key: string]: string | undefined;
                'x-ms-activity-id'?: string;
              };
            };
            
            logger.error('Error querying document:', {
              error: queryError.message,
              code: queryError.code,
              statusCode: queryError.statusCode,
              activityId: queryError.headers?.['x-ms-activity-id']
            });
          }
          
          throw new Error(`Failed to read document: ${readError.message}`);
        }
        
        if (!readDoc) {
          throw new Error('Failed to read back the inserted document - document not found');
        }
        
        logger.info('Successfully verified document:', {
          id: readDoc.id,
          etag: readDoc._etag,
          timestamp: readDoc.timestamp
        });
        
        // Clean up
        logger.info('Cleaning up test document...');
        const { statusCode: deleteStatusCode } = await container.item(createdDoc.id, getPartitionKeyValue(createdDoc)).delete();
        
        if (deleteStatusCode >= 400) {
          throw new Error(`Failed to delete test document: status code ${deleteStatusCode}`);
        }
        
        logger.info('Test document cleaned up successfully');
        
      } catch (docError) {
        logger.error('Error during document operation:', {
          error: docError.message,
          code: docError.code,
          stack: docError.stack,
          documentId: testDoc.id,
          partitionKey: testDoc._partitionKey
        });
        throw docError;
      }
      
    } catch (error) {
      const containerError = error as Error & {
        code?: string;
        statusCode?: number;
        name?: string;
        request?: unknown;
        response?: {
          statusCode?: number;
          headers?: {
            [key: string]: string | undefined;
            'x-ms-activity-id'?: string;
            'x-ms-substatus'?: string;
          };
        };
        body?: {
          code?: string;
          message?: string;
          additionalErrorInfo?: unknown;
        };
      };
      
      // Enhanced error logging for container access issues
      const errorInfo: Record<string, unknown> = {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        name: error.name,
        request: error.request,
        response: error.response ? {
          statusCode: error.response.statusCode,
          headers: error.response.headers,
          body: error.response.body
        } : undefined
      };
      
      logger.error('Error accessing container:', errorInfo);
      
      // Log the full error object for debugging
      try {
        logger.error('Full error object:', JSON.stringify(error, null, 2));
      } catch (e) {
        logger.error('Could not stringify error object:', e);
      }
      
      // Check if the error is due to missing container and suggest creating it
      if (error.code === '404' || error.statusCode === 404) {
        logger.warn('Container not found. You may need to create it with the correct partition key.');
        logger.warn('Example command:');
        logger.warn(`  az cosmosdb sql container create \
          --account-name <account-name> \
          --database-name ${databaseName} \
          --name ${containerName} \
          --partition-key-path '/_partitionKey' \
          --throughput 400`);
      }
      
      throw containerError;
    }
    
    return { success: true };
  } catch (error) {
    const errorInfo: Record<string, unknown> = {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      name: error.name,
      request: error.request,
      response: error.response ? {
        statusCode: error.response.statusCode,
        headers: error.response.headers,
        body: error.response.body
      } : undefined
    };
    
    logger.error('Cosmos DB connection test failed:', errorInfo);
    return { success: false, error: error.message };
  }
}

// Run the test
testConnection()
  .then(({ success }) => {
    logger.info(`Test ${success ? 'succeeded' : 'failed'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    logger.error('Unhandled error in test:', error);
    process.exit(1);
  });
