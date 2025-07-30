import { initializeCosmosDB } from '../server/src/services/cosmos-db/cosmos-db.service.js';
import { logger } from '../server/src/utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

async function addSampleData() {
  try {
    logger.info('Adding sample data to Cosmos DB...');
    const cosmosDb = await initializeCosmosDB();
    const container = cosmosDb.database.container('excel-records');

    const sampleDocument = {
      id: uuidv4(),
      _partitionKey: 'sample-data',
      documentType: 'excel-record',
      name: 'Sample Product',
      category: 'Electronics',
      price: 1200,
      quantity: 5,
      date: new Date().toISOString(),
      location: 'Warehouse A',
    };

    const { resource: createdItem } = await container.items.upsert(sampleDocument);
    logger.info('Successfully added sample document:', createdItem);

    logger.info('Sample data added successfully.');
    return { success: true };
  } catch (error) {
    logger.error('Failed to add sample data:', error);
    return { success: false, error: error.message };
  }
}

addSampleData()
  .then(({ success }) => {
    logger.info(`Add sample data ${success ? 'succeeded' : 'failed'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    logger.error('Unhandled error in addSampleData:', error);
    process.exit(1);
  });
